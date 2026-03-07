import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

test("POST /api/workflows/change-assessment validates and returns structured assessment", async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const okResponse = await fetch(`${base}/api/workflows/change-assessment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "tenant-acme",
        projectId: "project-alpha",
        changeText: "Move delivery date forward by two weeks",
        sourceType: "client_request"
      })
    });
    assert.equal(okResponse.status, 200);
    const okBody = (await okResponse.json()) as any;
    assert.equal(okBody.workflowId, "change_assessment");
    assert.ok(okBody.impactAssessment);

    const badResponse = await fetch(`${base}/api/workflows/change-assessment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "tenant-acme",
        changeText: ""
      })
    });
    assert.equal(badResponse.status, 400);
  } finally {
    server.close();
  }
});
