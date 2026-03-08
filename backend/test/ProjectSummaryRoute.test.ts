import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

test("POST /api/workflows/project-summary returns structured summary result", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const okResponse = await fetch(`${base}/api/workflows/project-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "tenant-acme",
        projectId: "project-alpha",
        message: "Prepare a project summary for leadership",
        contextType: "executive_summary"
      })
    });
    assert.equal(okResponse.status, 200);
    const body = (await okResponse.json()) as any;
    assert.equal(body.workflowId, "project_summary");
    assert.ok(["green", "amber", "red", "unknown"].includes(body.deliveryHealth));
    assert.ok(Array.isArray(body.keyAchievements));

    const badResponse = await fetch(`${base}/api/workflows/project-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: ""
      })
    });
    assert.equal(badResponse.status, 400);
  } finally {
    server.close();
  }
});
