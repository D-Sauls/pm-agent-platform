import { stdin, stdout } from "node:process";
import { Pool } from "pg";
import {
  buildPostgresPoolConfig,
  postgresCoreMigrationSql
} from "./PostgresManagedDocumentDatabase.js";

type WorkerRequest = {
  connectionString: string;
  ssl: boolean;
  operation: string;
  args: unknown[];
};

type StoredRow = {
  payload: unknown;
};

async function readRequest(): Promise<WorkerRequest> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as WorkerRequest;
}

function writeOk(value: unknown): void {
  stdout.write(JSON.stringify({ ok: true, value }));
}

function writeError(error: unknown): void {
  const typed = error as Error & { code?: string };
  stdout.write(JSON.stringify({
    ok: false,
    error: {
      message: typed.message || "PostgreSQL document store operation failed",
      code: typed.code
    }
  }));
}

async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
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
      await client.query(postgresCoreMigrationSql);
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

async function run(): Promise<void> {
  const request = await readRequest();
  const pool = new Pool(buildPostgresPoolConfig(request.connectionString, request.ssl));

  try {
    const [scope, tenantId, id, value] = request.args as [string, string, string, unknown];

    switch (request.operation) {
      case "migrate": {
        await migrate(pool);
        writeOk(true);
        break;
      }
      case "upsert": {
        const now = new Date();
        await pool.query(
          `INSERT INTO documents (scope, tenant_id, id, payload, created_at, updated_at)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6)
           ON CONFLICT(scope, tenant_id, id)
           DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
          [scope, tenantId, id, JSON.stringify(value), now, now]
        );
        writeOk(value);
        break;
      }
      case "get": {
        const result = await pool.query<StoredRow>(
          "SELECT payload FROM documents WHERE scope = $1 AND tenant_id = $2 AND id = $3",
          [scope, tenantId, id]
        );
        writeOk(result.rows[0]?.payload ?? null);
        break;
      }
      case "list": {
        const result = await pool.query<StoredRow>(
          "SELECT payload FROM documents WHERE scope = $1 AND tenant_id = $2 ORDER BY created_at ASC",
          [scope, tenantId]
        );
        writeOk(result.rows.map((row) => row.payload));
        break;
      }
      case "replaceScope": {
        const [replaceScope, replaceTenantId, values] = request.args as [string, string, Array<{ id: string }>];
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("DELETE FROM documents WHERE scope = $1 AND tenant_id = $2", [replaceScope, replaceTenantId]);
          const now = new Date();
          for (const item of values) {
            await client.query(
              `INSERT INTO documents (scope, tenant_id, id, payload, created_at, updated_at)
               VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
              [replaceScope, replaceTenantId, item.id, JSON.stringify(item), now, now]
            );
          }
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
        writeOk(true);
        break;
      }
      case "append": {
        await pool.query(
          `INSERT INTO append_events (scope, tenant_id, id, payload, created_at)
           VALUES ($1, $2, $3, $4::jsonb, $5)`,
          [scope, tenantId, id, JSON.stringify(value), new Date()]
        );
        writeOk(value);
        break;
      }
      case "listEvents": {
        const result = await pool.query<StoredRow>(
          "SELECT payload FROM append_events WHERE scope = $1 AND tenant_id = $2 ORDER BY created_at ASC",
          [scope, tenantId]
        );
        writeOk(result.rows.map((row) => row.payload));
        break;
      }
      case "checkReady": {
        const result = await pool.query<{ ready: number }>("SELECT 1 AS ready");
        writeOk(result.rows[0]?.ready === 1);
        break;
      }
      default:
        throw new Error(`Unsupported PostgreSQL document store operation: ${request.operation}`);
    }
  } finally {
    await pool.end();
  }
}

run().catch((error: unknown) => {
  writeError(error);
});