import { Pool, type PoolConfig, type QueryResultRow } from "pg";

function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}

const migration = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  scope TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (scope, tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_documents_scope_tenant
  ON documents (scope, tenant_id);

CREATE TABLE IF NOT EXISTS append_events (
  scope TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (scope, tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_append_events_scope_tenant
  ON append_events (scope, tenant_id, created_at);
`;

type StoredRow = QueryResultRow & {
  payload: unknown;
};

export class PostgresManagedDocumentDatabase {
  private readonly pool: Pool;

  constructor(config: PoolConfig) {
    this.pool = new Pool(config);
  }

  static fromConnectionString(connectionString: string, ssl = false): PostgresManagedDocumentDatabase {
    return new PostgresManagedDocumentDatabase({
      connectionString,
      ssl: ssl ? { rejectUnauthorized: true } : undefined
    });
  }

  async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL
);
`);
      const existing = await client.query<{ id: string }>(
        "SELECT id FROM schema_migrations WHERE id = $1",
        ["001_core_persistence"]
      );
      if (existing.rowCount === 0) {
        await client.query(migration);
        await client.query(
          "INSERT INTO schema_migrations (id, applied_at) VALUES ($1, $2)",
          ["001_core_persistence", new Date()]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async upsertDocument<T>(scope: string, tenantId: string, id: string, value: T): Promise<T> {
    const now = new Date();
    await this.pool.query(
      `INSERT INTO documents (scope, tenant_id, id, payload, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       ON CONFLICT(scope, tenant_id, id)
       DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      [scope, tenantId, id, JSON.stringify(value), now, now]
    );
    return value;
  }

  async getDocument<T>(scope: string, tenantId: string, id: string): Promise<T | null> {
    const result = await this.pool.query<StoredRow>(
      "SELECT payload FROM documents WHERE scope = $1 AND tenant_id = $2 AND id = $3",
      [scope, tenantId, id]
    );
    const payload = result.rows[0]?.payload;
    return payload ? this.parse<T>(payload) : null;
  }

  async listDocuments<T>(scope: string, tenantId: string): Promise<T[]> {
    const result = await this.pool.query<StoredRow>(
      "SELECT payload FROM documents WHERE scope = $1 AND tenant_id = $2 ORDER BY created_at ASC",
      [scope, tenantId]
    );
    return result.rows.map((row) => this.parse<T>(row.payload));
  }

  async replaceDocumentScope<T extends { id: string }>(
    scope: string,
    tenantId: string,
    values: T[]
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM documents WHERE scope = $1 AND tenant_id = $2", [scope, tenantId]);
      const now = new Date();
      for (const value of values) {
        await client.query(
          `INSERT INTO documents (scope, tenant_id, id, payload, created_at, updated_at)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
          [scope, tenantId, value.id, JSON.stringify(value), now, now]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async appendEvent<T extends { id: string }>(
    scope: string,
    tenantId: string,
    id: string,
    value: T
  ): Promise<T> {
    await this.pool.query(
      `INSERT INTO append_events (scope, tenant_id, id, payload, created_at)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [scope, tenantId, id, JSON.stringify(value), new Date()]
    );
    return value;
  }

  async listEvents<T>(scope: string, tenantId: string): Promise<T[]> {
    const result = await this.pool.query<StoredRow>(
      "SELECT payload FROM append_events WHERE scope = $1 AND tenant_id = $2 ORDER BY created_at ASC",
      [scope, tenantId]
    );
    return result.rows.map((row) => this.parse<T>(row.payload));
  }

  async checkReady(): Promise<boolean> {
    const result = await this.pool.query<{ ready: number }>("SELECT 1 AS ready");
    return result.rows[0]?.ready === 1;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private parse<T>(payload: unknown): T {
    return JSON.parse(JSON.stringify(payload), reviveDates) as T;
  }
}
