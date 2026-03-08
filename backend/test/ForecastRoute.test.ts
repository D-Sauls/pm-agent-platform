import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

test("POST /api/workflows/forecast returns structured forecast result", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const okResponse = await fetch(`${base}/api/workflows/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "tenant-acme",
        projectId: "project-alpha",
        forecastType: "full",
        message: "Show forecast for this project"
      })
    });
    assert.equal(okResponse.status, 200);
    const body = (await okResponse.json()) as any;
    assert.equal(body.workflowId, "forecast");
    assert.ok(body.deliveryForecast);
    assert.ok(body.capacityForecast);
    assert.ok(body.billingForecast);
    assert.ok(Array.isArray(body.recommendedActions));

    const badResponse = await fetch(`${base}/api/workflows/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: "" })
    });
    assert.equal(badResponse.status, 400);
  } finally {
    server.close();
  }
});
