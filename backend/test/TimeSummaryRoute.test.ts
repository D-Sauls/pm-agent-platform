import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

test("time entry ingest and summary routes return structured tenant-aware responses", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const ingestResponse = await fetch(`${base}/api/time-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "tenant-acme",
        entries: [
          {
            timeEntryId: "te-route-1",
            tenantId: "tenant-acme",
            projectId: "project-alpha",
            sourceSystem: "manual",
            userId: "user-1",
            userDisplayName: "Alex PM",
            entryDate: "2026-03-03T00:00:00.000Z",
            hours: 5,
            billableStatus: "billable",
            billingCategory: "client delivery"
          }
        ]
      })
    });
    assert.equal(ingestResponse.status, 201);

    const summaryResponse = await fetch(
      `${base}/api/time/summary?tenantId=tenant-acme&projectId=project-alpha&startDate=2026-03-01&endDate=2026-03-31`
    );
    assert.equal(summaryResponse.status, 200);
    const summaryBody = (await summaryResponse.json()) as any;
    assert.equal(summaryBody.summary.tenantId, "tenant-acme");
    assert.ok(summaryBody.summary.totalHours >= 5);

    const resourceSummaryResponse = await fetch(
      `${base}/api/time/resource-summary?tenantId=tenant-acme&projectId=project-alpha&startDate=2026-03-01&endDate=2026-03-31`
    );
    assert.equal(resourceSummaryResponse.status, 200);
    const resourceBody = (await resourceSummaryResponse.json()) as any;
    assert.ok(Array.isArray(resourceBody.resourceSummary));
  } finally {
    server.close();
  }
});
