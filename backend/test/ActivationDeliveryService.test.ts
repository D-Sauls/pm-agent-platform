import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { env } from "../src/config/env.js";
import { SqliteAppDatabase } from "../src/core/database/SqliteAppDatabase.js";
import { defaultProvisioningConfig, type UserImportRow } from "../src/core/models/hrImportModels.js";
import { createDatabaseRepositories } from "../src/core/repositories/database/DatabaseRepositories.js";
import { ActivationDeliveryService } from "../src/core/services/hr/ActivationDeliveryService.js";
import { UserProvisioningService } from "../src/core/services/hr/UserProvisioningService.js";

function testDatabasePath(name: string): string {
  return path.resolve(process.cwd(), "data", `${name}-${process.pid}.db`);
}

function validRow(employeeCode = "EMP-1"): UserImportRow {
  return {
    id: `row-${employeeCode}`,
    importJobId: "job-1",
    rowNumber: 1,
    rawData: {},
    mappedData: {
      employeeCode,
      firstName: "Activation",
      lastName: "User",
      workEmail: `${employeeCode.toLowerCase()}@example.com`
    },
    validationStatus: "valid",
    errorMessages: [],
    warningMessages: [],
    provisioningStatus: "pending"
  };
}

function withEnv<T>(updates: Partial<typeof env>, callback: () => Promise<T> | T): Promise<T> {
  const previous = new Map(Object.keys(updates).map((key) => [key, (env as Record<string, unknown>)[key]]));
  Object.assign(env, updates);
  return Promise.resolve(callback()).finally(() => {
    for (const [key, value] of previous) {
      (env as Record<string, unknown>)[key] = value;
    }
  });
}

test("activation delivery local preview records durable attempt", async () => {
  const filePath = testDatabasePath("activation-local-preview");
  fs.rmSync(filePath, { force: true });
  const db = new SqliteAppDatabase(filePath);
  const repositories = createDatabaseRepositories(db);
  const provisioning = new UserProvisioningService(repositories.hrImportRepository);
  const activation = provisioning.provision("tenant-delivery", validRow(), defaultProvisioningConfig);

  const outcome = await withEnv(
    { activationDeliveryMode: "log", activationDeliveryPreview: true, activationBaseUrl: "http://localhost:5173/activate" },
    () => new ActivationDeliveryService(repositories.hrImportRepository).deliver(activation)
  );

  assert.equal(outcome.status, "delivered");
  assert.equal(outcome.channel, "log");
  assert.ok(outcome.preview?.activationUrl?.includes("activationToken="));
  const attempts = repositories.hrImportRepository.listActivationDeliveryAttempts("tenant-delivery", activation.user.id);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0]?.provider, "local_preview");

  db.close();
  fs.rmSync(filePath, { force: true });
});

test("activation delivery sends through SendGrid provider and records queued result", async () => {
  const filePath = testDatabasePath("activation-sendgrid-success");
  fs.rmSync(filePath, { force: true });
  const db = new SqliteAppDatabase(filePath);
  const repositories = createDatabaseRepositories(db);
  const provisioning = new UserProvisioningService(repositories.hrImportRepository);
  const activation = provisioning.provision("tenant-delivery", validRow("EMP-2"), defaultProvisioningConfig);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-key");
    return new Response(null, { status: 202 });
  }) as typeof fetch;

  try {
    const outcome = await withEnv(
      {
        activationDeliveryMode: "email",
        activationEmailProvider: "sendgrid",
        sendGridApiKey: "test-key",
        activationSenderEmail: "no-reply@example.com"
      },
      () => new ActivationDeliveryService(repositories.hrImportRepository).deliver(activation)
    );
    assert.equal(outcome.status, "queued");
    assert.equal(outcome.channel, "email");
    assert.equal(repositories.hrImportRepository.listActivationDeliveryAttempts("tenant-delivery", activation.user.id)[0]?.provider, "sendgrid");
  } finally {
    globalThis.fetch = originalFetch;
    db.close();
    fs.rmSync(filePath, { force: true });
  }
});

test("activation delivery records provider failure", async () => {
  const filePath = testDatabasePath("activation-sendgrid-failure");
  fs.rmSync(filePath, { force: true });
  const db = new SqliteAppDatabase(filePath);
  const repositories = createDatabaseRepositories(db);
  const provisioning = new UserProvisioningService(repositories.hrImportRepository);
  const activation = provisioning.provision("tenant-delivery", validRow("EMP-3"), defaultProvisioningConfig);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("bad", { status: 500 })) as typeof fetch;

  try {
    const outcome = await withEnv(
      {
        activationDeliveryMode: "email",
        activationEmailProvider: "sendgrid",
        sendGridApiKey: "test-key",
        activationSenderEmail: "no-reply@example.com"
      },
      () => new ActivationDeliveryService(repositories.hrImportRepository).deliver(activation)
    );
    assert.equal(outcome.status, "failed");
    const attempt = repositories.hrImportRepository.listActivationDeliveryAttempts("tenant-delivery", activation.user.id)[0];
    assert.equal(attempt?.errorMessage, "HTTP 500");
    assert.ok(attempt?.failedAt);
  } finally {
    globalThis.fetch = originalFetch;
    db.close();
    fs.rmSync(filePath, { force: true });
  }
});

test("resend activation invalidates old token and records new delivery attempt", async () => {
  const filePath = testDatabasePath("activation-resend");
  fs.rmSync(filePath, { force: true });
  const db = new SqliteAppDatabase(filePath);
  const repositories = createDatabaseRepositories(db);
  const provisioning = new UserProvisioningService(repositories.hrImportRepository);
  const delivery = new ActivationDeliveryService(repositories.hrImportRepository);
  const initial = provisioning.provision("tenant-delivery", validRow("EMP-4"), defaultProvisioningConfig);
  const resent = provisioning.resendActivation("tenant-delivery", initial.user.id, defaultProvisioningConfig);

  await withEnv({ activationDeliveryMode: "log", activationDeliveryPreview: true }, () => delivery.deliver(resent));

  assert.throws(() => provisioning.completeActivation({ token: initial.oneTimeSecret!, password: "Password123" }));
  const activated = provisioning.completeActivation({ token: resent.oneTimeSecret, password: "Password123" });
  assert.equal(activated.user.accountStatus, "active");
  assert.equal(repositories.hrImportRepository.listActivationDeliveryAttempts("tenant-delivery", initial.user.id).length, 1);

  db.close();
  fs.rmSync(filePath, { force: true });
});
