import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { workflowTelemetryService } from "../src/observability/runtime.js";

test("workflow telemetry captures workflow execution events", async () => {
  const before = workflowTelemetryService.recent(500).length;

  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const response = await fetch(`${base}/api/workflows/project-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "tenant-acme",
        projectId: "project-alpha",
        message: "Project overview"
      })
    });
    assert.equal(response.status, 200);
    const after = workflowTelemetryService.recent(500).length;
    assert.ok(after >= before + 1);
  } finally {
    server.close();
  }
});
