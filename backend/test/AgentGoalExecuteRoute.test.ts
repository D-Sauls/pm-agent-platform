import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

test("POST /api/agent/goal-execute returns bounded agentic response", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const response = await fetch(`${base}/api/agent/goal-execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-user|tenant-acme",
        "x-tenant-id": "tenant-acme"
      },
      body: JSON.stringify({
        tenantId: "tenant-acme",
        projectId: "project-alpha",
        message: "Give me an executive summary with forecast and risks"
      })
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as any;
    assert.ok(body.planId);
    assert.ok(Array.isArray(body.stepExecutions));
    assert.ok(Array.isArray(body.response.workflowsExecuted));
    assert.ok(typeof body.response.synthesizedSummary === "string");
    assert.ok(body.stepExecutions.length <= 4);
  } finally {
    server.close();
  }
});

test("POST /api/agent/goal-execute returns structured error for unsupported ambiguous goal", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const response = await fetch(`${base}/api/agent/goal-execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": "goal-fail-1",
        Authorization: "Bearer test-user|tenant-acme",
        "x-tenant-id": "tenant-acme"
      },
      body: JSON.stringify({
        tenantId: "tenant-acme",
        projectId: "project-alpha",
        message: "?"
      })
    });
    assert.equal(response.status, 400);
    const body = (await response.json()) as any;
    assert.equal(body.code, "WORKFLOW_EXECUTION_FAILED");
    assert.equal(body.requestId, "goal-fail-1");
  } finally {
    server.close();
  }
});
