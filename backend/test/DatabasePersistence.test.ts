import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { SqliteAppDatabase } from "../src/core/database/SqliteAppDatabase.js";
import { createDatabaseRepositories } from "../src/core/repositories/database/DatabaseRepositories.js";

function testDatabasePath(name: string): string {
  return path.resolve(process.cwd(), "data", `${name}-${process.pid}.db`);
}

test("database repositories persist tenant onboarding data across reinitialization", async () => {
  const filePath = testDatabasePath("persistence-reinit");
  fs.rmSync(filePath, { force: true });

  const tenantId = "tenant-persistence";
  const userId = "user-persistence";
  const db = new SqliteAppDatabase(filePath);
  const repositories = createDatabaseRepositories(db);

  await repositories.tenantRepository.create({
    tenantId,
    organizationName: "Persistence Foods",
    status: "active",
    licenseStatus: "active",
    planType: "enterprise",
    createdDate: new Date("2026-01-01T00:00:00.000Z"),
    updatedDate: new Date("2026-01-01T00:00:00.000Z"),
    defaultPromptVersion: "onboarding_assistant:v1",
    enabledConnectors: ["sharepoint"],
    featureFlags: ["hrImportPreview"]
  });
  await repositories.licenseRepository.upsert({
    tenantId,
    status: "active",
    planType: "enterprise",
    expiryDate: null,
    trialEndsAt: null,
    lastValidatedAt: null
  });
  repositories.courseCatalogRepository.upsert({
    id: "course-persistence",
    tenantId,
    title: "Kitchen Safety",
    description: "Safety onboarding",
    tags: ["kitchen"],
    roleTargets: ["Kitchen Staff"],
    publishedStatus: "published",
    modules: []
  });
  repositories.policyCatalogRepository.upsert({
    id: "policy-persistence",
    tenantId,
    title: "Food Safety Policy",
    category: "safety",
    documentReference: "sharepoint://food-safety",
    tags: ["food"],
    applicableRoles: ["Kitchen Staff"]
  });
  repositories.learningProgressRepository.upsert({
    tenantId,
    userId,
    courseId: "course-persistence",
    moduleId: "module-1",
    lessonId: "lesson-1",
    completionStatus: "completed",
    completionDate: new Date("2026-01-02T00:00:00.000Z")
  });
  repositories.policyVersionRepository.appendSync({
    id: "policy-persistence-v1",
    tenantId,
    policyId: "policy-persistence",
    versionLabel: "v1",
    documentReference: "sharepoint://food-safety-v1",
    effectiveDate: new Date("2026-01-01T00:00:00.000Z"),
    publishedBy: "admin",
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    isCurrent: true
  });
  repositories.acknowledgementRepository.appendSync({
    id: "ack-persistence",
    tenantId,
    userId,
    subjectType: "policy",
    subjectId: "policy-persistence",
    subjectVersionId: "policy-persistence-v1",
    acknowledgementType: "accepted",
    status: "completed",
    actorId: userId,
    actorRole: "employee",
    recordedAt: new Date("2026-01-03T00:00:00.000Z")
  });
  repositories.hrImportRepository.createJob({
    id: "job-persistence",
    tenantId,
    fileName: "employees.csv",
    fileType: "csv",
    uploadedBy: "admin",
    startedAt: new Date("2026-01-01T00:00:00.000Z"),
    completedAt: null,
    status: "preview_ready",
    totalRows: 1,
    successfulRows: 0,
    failedRows: 0
  });
  repositories.hrImportRepository.createUser({
    id: userId,
    tenantId,
    employeeCode: "EMP-1",
    username: "EMP-1",
    firstName: "Test",
    lastName: "User",
    workEmail: "test@example.com",
    accountStatus: "pending_activation",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z")
  });
  db.close();

  const reopened = new SqliteAppDatabase(filePath);
  const reopenedRepositories = createDatabaseRepositories(reopened);

  assert.equal((await reopenedRepositories.tenantRepository.getById(tenantId))?.organizationName, "Persistence Foods");
  assert.equal((await reopenedRepositories.licenseRepository.getByTenantId(tenantId))?.status, "active");
  assert.equal(reopenedRepositories.courseCatalogRepository.getById(tenantId, "course-persistence")?.title, "Kitchen Safety");
  assert.equal(reopenedRepositories.policyCatalogRepository.getById(tenantId, "policy-persistence")?.title, "Food Safety Policy");
  assert.equal(reopenedRepositories.learningProgressRepository.listByUser(tenantId, userId).length, 1);
  assert.equal(reopenedRepositories.policyVersionRepository.listByPolicySync("policy-persistence")[0]?.id, "policy-persistence-v1");
  assert.equal(reopenedRepositories.acknowledgementRepository.listByTenantSync(tenantId)[0]?.subjectVersionId, "policy-persistence-v1");
  assert.equal(reopenedRepositories.hrImportRepository.listJobs(tenantId)[0]?.id, "job-persistence");
  assert.equal(reopenedRepositories.hrImportRepository.findUserByEmployeeCode(tenantId, "EMP-1")?.id, userId);
  assert.equal(reopenedRepositories.hrImportRepository.listUsers("tenant-other").length, 0);

  reopened.close();
  fs.rmSync(filePath, { force: true });
});

test("database repositories keep evidence and audit records append-only", async () => {
  const filePath = testDatabasePath("append-only");
  fs.rmSync(filePath, { force: true });

  const tenantId = "tenant-append-only";
  const db = new SqliteAppDatabase(filePath);
  const repositories = createDatabaseRepositories(db);

  repositories.acknowledgementRepository.appendSync({
    id: "ack-immutable",
    tenantId,
    userId: "user-1",
    subjectType: "policy",
    subjectId: "policy-1",
    subjectVersionId: "policy-v1",
    acknowledgementType: "accepted",
    status: "completed",
    actorId: "user-1",
    actorRole: "employee",
    recordedAt: new Date("2026-01-01T00:00:00.000Z")
  });
  repositories.acknowledgementRepository.appendIfMissing({
    id: "ack-immutable",
    tenantId,
    userId: "user-1",
    subjectType: "policy",
    subjectId: "policy-1",
    subjectVersionId: "policy-v2",
    acknowledgementType: "accepted",
    status: "invalidated",
    actorId: "admin",
    actorRole: "admin",
    recordedAt: new Date("2026-01-02T00:00:00.000Z")
  });

  const evidence = repositories.acknowledgementRepository.listByTenantSync(tenantId);
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0]?.subjectVersionId, "policy-v1");
  assert.equal(evidence[0]?.status, "completed");

  await repositories.adminAuditLogRepository.append({
    id: "audit-immutable",
    tenantId,
    actorId: "admin-1",
    actorRole: "superadmin",
    action: "policy.version.publish",
    targetType: "policy",
    targetId: "policy-1",
    timestamp: new Date("2026-01-01T00:00:00.000Z")
  });

  await assert.rejects(() =>
    repositories.adminAuditLogRepository.append({
      id: "audit-immutable",
      tenantId,
      actorId: "admin-2",
      actorRole: "superadmin",
      action: "tamper",
      targetType: "policy",
      targetId: "policy-1",
      timestamp: new Date("2026-01-02T00:00:00.000Z")
    })
  );

  const audit = await repositories.adminAuditLogRepository.listRecent(10);
  assert.equal(audit.filter((entry) => entry.id === "audit-immutable").length, 1);
  assert.equal(audit.find((entry) => entry.id === "audit-immutable")?.action, "policy.version.publish");

  db.close();
  fs.rmSync(filePath, { force: true });
});

import { PostgresDocumentStore } from "../src/core/database/PostgresDocumentStore.js";

test(
  "managed PostgreSQL document store runs migration and preserves tenant isolation",
  { skip: !process.env.TEST_MANAGED_DATABASE_URL },
  () => {
    const connectionString = process.env.TEST_MANAGED_DATABASE_URL as string;
    const store = new PostgresDocumentStore(connectionString, process.env.TEST_MANAGED_DATABASE_SSL === "true");
    const scope = `managed-test-${process.pid}-${Date.now()}`;

    store.upsert(scope, "tenant-a", "shared-id", { id: "shared-id", tenantId: "tenant-a", value: "a" });
    store.upsert(scope, "tenant-b", "shared-id", { id: "shared-id", tenantId: "tenant-b", value: "b" });
    store.append(`${scope}-events`, "tenant-a", "event-1", { id: "event-1", tenantId: "tenant-a", value: "first" });

    assert.equal(store.get<{ value: string }>(scope, "tenant-a", "shared-id")?.value, "a");
    assert.equal(store.get<{ value: string }>(scope, "tenant-b", "shared-id")?.value, "b");
    assert.equal(store.list<{ value: string }>(scope, "tenant-a").length, 1);
    assert.equal(store.listEvents<{ value: string }>(`${scope}-events`, "tenant-b").length, 0);
    assert.throws(() =>
      store.append(`${scope}-events`, "tenant-a", "event-1", {
        id: "event-1",
        tenantId: "tenant-a",
        value: "tamper"
      })
    );
    assert.equal(store.listEvents<{ value: string }>(`${scope}-events`, "tenant-a")[0]?.value, "first");
  }
);
