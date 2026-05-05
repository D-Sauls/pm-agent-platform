import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPostgresPoolConfig,
  postgresCoreMigrationSql
} from "../src/core/database/PostgresManagedDocumentDatabase.js";
import {
  createDatabaseRuntimeInfo,
  detectDatabaseDriver,
  isManagedDatabaseUrl
} from "../src/core/database/DatabaseRuntime.js";

test("detectDatabaseDriver infers managed PostgreSQL URLs", () => {
  assert.equal(detectDatabaseDriver("postgres://user:pass@db.example.com/app"), "postgres");
  assert.equal(detectDatabaseDriver("postgresql://user:pass@db.example.com/app"), "postgres");
  assert.equal(isManagedDatabaseUrl("postgresql://user:pass@db.example.com/app"), true);
});

test("detectDatabaseDriver keeps SQLite as the local default", () => {
  assert.equal(detectDatabaseDriver("file:./data/onboarding-local.db"), "sqlite");
  assert.equal(isManagedDatabaseUrl("file:./data/onboarding-local.db"), false);
});

test("production readiness fails when PostgreSQL is configured but not active", () => {
  const info = createDatabaseRuntimeInfo({
    env: {
      appEnv: "production",
      databaseUrl: "postgres://user:pass@db.example.com/app",
      persistenceDriver: "postgres"
    },
    databaseUrlConfigured: true,
    adapterReady: false
  });

  assert.equal(info.driver, "postgres");
  assert.equal(info.managed, true);
  assert.equal(info.productionReady, false);
  assert.ok(info.warnings.some((warning) => warning.includes("not yet using the managed database adapter")));
});

test("production readiness fails when DATABASE_URL is missing", () => {
  const info = createDatabaseRuntimeInfo({
    env: {
      appEnv: "production",
      databaseUrl: "",
      persistenceDriver: ""
    },
    databaseUrlConfigured: false,
    adapterReady: false
  });

  assert.equal(info.productionReady, false);
  assert.ok(info.warnings.some((warning) => warning.includes("DATABASE_URL is required")));
});

test("production readiness fails when SQLite is configured", () => {
  const info = createDatabaseRuntimeInfo({
    env: {
      appEnv: "production",
      databaseUrl: "file:./data/onboarding-local.db",
      persistenceDriver: "sqlite"
    },
    databaseUrlConfigured: true,
    databasePath: "data/onboarding-local.db",
    adapterReady: false
  });

  assert.equal(info.driver, "sqlite");
  assert.equal(info.managed, false);
  assert.equal(info.productionReady, false);
  assert.ok(info.warnings.some((warning) => warning.includes("SQLite file persistence")));
});

test("production readiness passes only when a managed adapter is active", () => {
  const info = createDatabaseRuntimeInfo({
    env: {
      appEnv: "production",
      databaseUrl: "postgres://user:pass@db.example.com/app",
      persistenceDriver: "postgres"
    },
    databaseUrlConfigured: true,
    adapterReady: true
  });

  assert.equal(info.driver, "postgres");
  assert.equal(info.managed, true);
  assert.equal(info.productionReady, true);
  assert.deepEqual(info.warnings, []);
});

test("PostgreSQL managed adapter config uses environment connection string and SSL", () => {
  const config = buildPostgresPoolConfig("postgres://user:pass@db.example.com/app", true);

  assert.equal(config.connectionString, "postgres://user:pass@db.example.com/app");
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
});

test("PostgreSQL migration keeps tenant-scoped documents and append-only events", () => {
  assert.match(postgresCoreMigrationSql, /CREATE TABLE IF NOT EXISTS documents/);
  assert.match(postgresCoreMigrationSql, /tenant_id TEXT NOT NULL/);
  assert.match(postgresCoreMigrationSql, /payload JSONB NOT NULL/);
  assert.match(postgresCoreMigrationSql, /PRIMARY KEY \(scope, tenant_id, id\)/);
  assert.match(postgresCoreMigrationSql, /CREATE TABLE IF NOT EXISTS append_events/);
  assert.match(postgresCoreMigrationSql, /PRIMARY KEY \(scope, tenant_id, id\)/);
  assert.doesNotMatch(postgresCoreMigrationSql, /ON CONFLICT\(scope, tenant_id, id\)\s+DO UPDATE/i);
});
