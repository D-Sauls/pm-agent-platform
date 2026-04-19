import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { employeeSessionService } from "../src/core/services/auth/EmployeeSessionService.js";
import {
  learningProgressServiceV2,
  policyVersionServiceV2,
  userProvisioningServiceV2
} from "../src/core/container.js";
import type { UserImportRow } from "../src/core/models/hrImportModels.js";

function listen(app: ReturnType<typeof createApp>): Promise<{ base: string; close: () => Promise<void> }> {
  const server = app.listen(0);
  return new Promise((resolve, reject) => {
    server.once("listening", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to resolve test port"));
        return;
      }
      resolve({
        base: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(() => done()))
      });
    });
    server.once("error", reject);
  });
}

test("employee routes require signed sessions and reject tenant mismatch", async () => {
  const app = createApp();
  const server = await listen(app);
  try {
    const legacy = await fetch(`${server.base}/api/learning/courses?tenantId=tenant-acme`, {
      headers: {
        Authorization: "Bearer user-fin-1|tenant-acme|pm",
        "x-tenant-id": "tenant-acme"
      }
    });
    assert.equal(legacy.status, 401);

    const token = employeeSessionService.issueSession({
      userId: "user-fin-1",
      tenantId: "tenant-acme",
      role: "employee",
      roleName: "Finance Analyst",
      department: "Finance"
    });
    const mismatch = await fetch(`${server.base}/api/learning/courses?tenantId=tenant-beta`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-tenant-id": "tenant-beta"
      }
    });
    assert.equal(mismatch.status, 403);
  } finally {
    await server.close();
  }
});

test("activation completes pending user and returns signed employee session", () => {
  const suffix = Date.now();
  const row: UserImportRow = {
    id: `row-activation-${suffix}`,
    importJobId: `job-activation-${suffix}`,
    rowNumber: 2,
    rawData: {},
    mappedData: {
      employeeCode: `ACT-${suffix}`,
      firstName: "Activation",
      lastName: "User",
      workEmail: `activation-${suffix}@example.com`,
      roleName: "Finance Analyst",
      department: "Finance"
    },
    validationStatus: "valid",
    errorMessages: [],
    warningMessages: [],
    provisioningStatus: "pending",
    createdUserId: null
  };

  const provisioned = userProvisioningServiceV2.provision("tenant-acme", row, {
    usernameMode: "employee_code",
    activationMode: "activation_link",
    requirePasswordResetOnFirstLogin: true,
    allowManualPasswordSetupByAdmin: false,
    duplicateEmailMode: "warning",
    missingRoleMappingMode: "warning",
    activationTtlHours: 72
  });

  assert.equal(provisioned.user.accountStatus, "pending_activation");
  assert.ok(provisioned.oneTimeSecret);

  const activated = userProvisioningServiceV2.completeActivation({
    tenantId: "tenant-acme",
    token: provisioned.oneTimeSecret!,
    password: "StrongPass123!"
  });
  assert.equal(activated.user.accountStatus, "active");
  assert.equal(employeeSessionService.verifySession(activated.sessionToken)?.userId, activated.user.id);
  assert.throws(() =>
    userProvisioningServiceV2.completeActivation({
      tenantId: "tenant-acme",
      token: provisioned.oneTimeSecret!,
      password: "StrongPass123!"
    })
  );
});

test("progress and acknowledgement are bound to authenticated employee context", async () => {
  const app = createApp();
  const server = await listen(app);
  const token = employeeSessionService.issueSession({
    userId: "secure-user-1",
    tenantId: "tenant-acme",
    role: "employee",
    roleName: "Finance Analyst",
    department: "Finance"
  });
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-tenant-id": "tenant-acme"
  };

  try {
    const progressResponse = await fetch(`${server.base}/api/learning/progress`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        tenantId: "tenant-acme",
        userId: "attacker-user",
        courseId: "course-finance-onboarding",
        moduleId: "module-finance-basics",
        lessonId: "lesson-finance-policy",
        completionStatus: "completed"
      })
    });
    assert.equal(progressResponse.status, 201);
    const progress = (await progressResponse.json()) as { tenantId: string; userId: string };
    assert.equal(progress.tenantId, "tenant-acme");
    assert.equal(progress.userId, "secure-user-1");
    assert.equal(learningProgressServiceV2.listProgressForUser("tenant-acme", "attacker-user").length, 0);

    const overpost = await fetch(`${server.base}/api/compliance/acknowledgements`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        tenantId: "tenant-acme",
        id: "forged-id",
        userId: "attacker-user",
        subjectType: "policy",
        subjectId: "policy-finance-controls",
        subjectVersionId: "forged-version",
        acknowledgementType: "accepted",
        status: "completed"
      })
    });
    assert.equal(overpost.status, 400);

    const acknowledgementResponse = await fetch(`${server.base}/api/compliance/acknowledgements`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        tenantId: "tenant-acme",
        subjectType: "policy",
        subjectId: "policy-finance-controls",
        acknowledgementType: "accepted"
      })
    });
    assert.equal(acknowledgementResponse.status, 201);
    const acknowledgement = (await acknowledgementResponse.json()) as {
      id: string;
      tenantId: string;
      userId: string;
      actorId: string;
      subjectVersionId: string;
      status: string;
    };
    assert.notEqual(acknowledgement.id, "forged-id");
    assert.equal(acknowledgement.userId, "secure-user-1");
    assert.equal(acknowledgement.actorId, "secure-user-1");
    assert.equal(acknowledgement.subjectVersionId, policyVersionServiceV2.getCurrentVersion("policy-finance-controls")?.id);
    assert.equal(acknowledgement.status, "completed");
  } finally {
    await server.close();
  }
});

test("PM workflow routes are retired and onboarding workflows remain available", async () => {
  const app = createApp();
  const server = await listen(app);
  const token = employeeSessionService.issueSession({
    userId: "secure-user-2",
    tenantId: "tenant-acme",
    role: "employee",
    roleName: "Finance Analyst",
    department: "Finance"
  });
  try {
    const retired = await fetch(`${server.base}/api/workflows/forecast`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-tenant-id": "tenant-acme"
      },
      body: JSON.stringify({ tenantId: "tenant-acme" })
    });
    assert.equal(retired.status, 410);

    const active = await fetch(
      `${server.base}/api/onboarding/path?tenantId=tenant-acme&role=Finance%20Analyst&department=Finance`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-id": "tenant-acme"
        }
      }
    );
    assert.equal(active.status, 200);
  } finally {
    await server.close();
  }
});
