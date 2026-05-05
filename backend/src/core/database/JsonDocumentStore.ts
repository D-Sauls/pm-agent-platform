import { SqliteAppDatabase } from "./SqliteAppDatabase.js";

export interface DocumentStore {
  upsert<T>(scope: string, tenantId: string, id: string, value: T): T;
  get<T>(scope: string, tenantId: string, id: string): T | null;
  list<T>(scope: string, tenantId: string): T[];
  replaceScope<T extends { id: string }>(scope: string, tenantId: string, values: T[]): void;
  append<T extends { id: string }>(scope: string, tenantId: string, id: string, value: T): T;
  listEvents<T>(scope: string, tenantId: string): T[];
}

type StoredRow = {
  id: string;
  payload: string;
  created_at: string;
  updated_at?: string;
};

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

export class JsonDocumentStore implements DocumentStore {
  constructor(private readonly database: SqliteAppDatabase) {}

  upsert<T>(
    scope: string,
    tenantId: string,
    id: string,
    value: T
  ): T {
    const now = new Date().toISOString();
    this.database.run(
      `INSERT INTO documents (scope, tenant_id, id, payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(scope, tenant_id, id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      [scope, tenantId, id, JSON.stringify(value), now, now]
    );
    return value;
  }

  get<T>(scope: string, tenantId: string, id: string): T | null {
    const row = this.database.get<StoredRow>(
      "SELECT id, payload, created_at, updated_at FROM documents WHERE scope = ? AND tenant_id = ? AND id = ?",
      [scope, tenantId, id]
    );
    return row ? this.parse<T>(row.payload) : null;
  }

  list<T>(scope: string, tenantId: string): T[] {
    return this.database
      .all<StoredRow>(
        "SELECT id, payload, created_at, updated_at FROM documents WHERE scope = ? AND tenant_id = ? ORDER BY created_at ASC",
        [scope, tenantId]
      )
      .map((row) => this.parse<T>(row.payload));
  }

  replaceScope<T extends { id: string }>(scope: string, tenantId: string, values: T[]): void {
    this.database.run("DELETE FROM documents WHERE scope = ? AND tenant_id = ?", [scope, tenantId]);
    for (const value of values) {
      this.upsert(scope, tenantId, value.id, value);
    }
  }

  append<T extends { id: string }>(scope: string, tenantId: string, id: string, value: T): T {
    this.database.run(
      `INSERT INTO append_events (scope, tenant_id, id, payload, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [scope, tenantId, id, JSON.stringify(value), new Date().toISOString()]
    );
    return value;
  }

  listEvents<T>(scope: string, tenantId: string): T[] {
    return this.database
      .all<StoredRow>(
        "SELECT id, payload, created_at FROM append_events WHERE scope = ? AND tenant_id = ? ORDER BY created_at ASC",
        [scope, tenantId]
      )
      .map((row) => this.parse<T>(row.payload));
  }

  private parse<T>(payload: string): T {
    return JSON.parse(payload, reviveDates) as T;
  }
}
