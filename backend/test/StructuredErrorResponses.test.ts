import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { employeeSessionService } from "../src/core/services/auth/EmployeeSessionService.js";

test("structured error responses include code and requestId", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const token = employeeSessionService.issueSession({
      userId: "err-user-1",
      tenantId: "tenant-acme",
      role: "employee",
      employeeCode: "ERR-1",
      department: "Finance",
      roleName: "Finance Analyst"
    });

    const response = await fetch(`${base}/api/agent/goal-execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-tenant-id": "tenant-acme",
        "x-request-id": "err-req-001"
      },
      body: JSON.stringify({ tenantId: "tenant-acme" })
    });
    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      code: string;
      message: string;
      requestId?: string;
    };
    assert.equal(body.code, "VALIDATION_ERROR");
    assert.equal(body.requestId, "err-req-001");
    assert.equal(typeof body.message, "string");
  } finally {
    server.close();
  }
});
