import assert from "node:assert/strict";
import test from "node:test";
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
