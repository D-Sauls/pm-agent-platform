import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

test("POST /api/workflows/delivery-advisor returns structured advisory result", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const okResponse = await fetch(`${base}/api/workflows/delivery-advisor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "tenant-acme",
        projectId: "project-alpha",
        message: "What should I focus on next?",
        contextType: "delivery_advice"
      })
    });
    assert.equal(okResponse.status, 200);
    const body = (await okResponse.json()) as any;
    assert.equal(body.workflowId, "delivery_advisor");
    assert.ok(Array.isArray(body.priorities));
    assert.ok(Array.isArray(body.blockers));

    const badResponse = await fetch(`${base}/api/workflows/delivery-advisor`, {
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
