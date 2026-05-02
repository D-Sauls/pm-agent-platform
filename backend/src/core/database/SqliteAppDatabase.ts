import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { env } from "../../config/env.js";

export interface DatabaseRuntimeInfo {
  driver: "sqlite";
  databaseUrlConfigured: boolean;
  databasePath: string;
  productionReady: boolean;
  warnings: string[];
}

const migrations = [
  {
    id: "001_core_persistence",
    sql: `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  scope TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scope, tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_documents_scope_tenant
  ON documents (scope, tenant_id);

CREATE TABLE IF NOT EXISTS append_events (
  scope TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (scope, tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_append_events_scope_tenant
  ON append_events (scope, tenant_id, created_at);
`
  }
];

function resolveDatabasePath(databaseUrl: string): string {
  const fallback = `file:${path.join(env.platformDataDir, "onboarding-local.db")}`;
  const url = databaseUrl || fallback;
  if (!url.startsWith("file:")) {
    throw new Error(`Unsupported DATABASE_URL for this runtime: ${url}. Use file:./path/to/database.db.`);
  }
  let rawPath = url.slice("file:".length);
  if (process.env.NODE_TEST_CONTEXT && !process.env.DATABASE_URL) {
    const parsed = path.parse(rawPath);
    rawPath = path.join(parsed.dir, `${parsed.name}.${process.pid}.test${parsed.ext || ".db"}`);
  }
  return path.resolve(process.cwd(), rawPath);
}

export class SqliteAppDatabase {
  private readonly database: DatabaseSync;

  constructor(private readonly filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.database = new DatabaseSync(filePath);
    this.migrate();
  }

  static fromEnv(): { database: SqliteAppDatabase; info: DatabaseRuntimeInfo } {
    const databasePath = resolveDatabasePath(env.databaseUrl);
    const databaseUrlConfigured = Boolean(env.databaseUrl);
    const warnings: string[] = [];
    if (env.appEnv === "production" && !databaseUrlConfigured) {
      warnings.push("DATABASE_URL is required in production. The runtime is using a local fallback database.");
    }
    if (env.appEnv === "production" && env.databaseUrl.startsWith("file:")) {
      warnings.push("SQLite file persistence is suitable for local pilots only; use a managed production database before scale rollout.");
    }
    const database = new SqliteAppDatabase(databasePath);
    return {
      database,
      info: {
        driver: "sqlite",
        databaseUrlConfigured,
        databasePath,
        productionReady: env.appEnv !== "production" ? true : databaseUrlConfigured && !env.databaseUrl.startsWith("file:"),
        warnings
      }
    };
  }

  run(sql: string, params: unknown[] = []): void {
    this.database.prepare(sql).run(...(params as never[]));
  }

  get<T>(sql: string, params: unknown[] = []): T | null {
    return (this.database.prepare(sql).get(...(params as never[])) as T | undefined) ?? null;
  }

  all<T>(sql: string, params: unknown[] = []): T[] {
    return this.database.prepare(sql).all(...(params as never[])) as T[];
  }

  exec(sql: string): void {
    this.database.exec(sql);
  }

  close(): void {
    this.database.close();
  }

  private migrate(): void {
    this.database.exec("PRAGMA busy_timeout = 5000;");
    this.database.exec("PRAGMA foreign_keys = ON;");
    this.database.exec(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`);
    for (const migration of migrations) {
      const existing = this.get<{ id: string }>("SELECT id FROM schema_migrations WHERE id = ?", [migration.id]);
      if (existing) {
        continue;
      }
      this.database.exec("BEGIN;");
      try {
        this.database.exec(migration.sql);
        this.run("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)", [
          migration.id,
          new Date().toISOString()
        ]);
        this.database.exec("COMMIT;");
      } catch (error) {
        this.database.exec("ROLLBACK;");
        throw error;
      }
    }
  }
}
