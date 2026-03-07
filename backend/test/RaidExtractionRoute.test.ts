import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

test("POST /api/workflows/raid-extraction validates and returns structured RAID result", async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve test server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const okResponse = await fetch(`${base}/api/workflows/raid-extraction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "tenant-acme",
        projectId: "project-alpha",
        notesText: "Please capture assumptions and dependencies from workshop notes.",
        sourceType: "workshop_notes"
      })
    });
    assert.equal(okResponse.status, 200);
    const okBody = (await okResponse.json()) as any;
    assert.equal(okBody.workflowId, "raid_extraction");
    assert.ok(Array.isArray(okBody.dependencies));

    const badResponse = await fetch(`${base}/api/workflows/raid-extraction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "tenant-acme",
        notesText: "",
        sourceType: "generic"
      })
    });
    assert.equal(badResponse.status, 400);
  } finally {
    server.close();
  }
});
