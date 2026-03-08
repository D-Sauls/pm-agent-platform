import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

test("weekly and monthly time/billing workflow routes return structured output", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const ingest = await fetch(`${base}/api/time-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "tenant-acme",
        entries: [
          {
            timeEntryId: "tbw-1",
            tenantId: "tenant-acme",
            projectId: "project-alpha",
            sourceSystem: "manual",
            userId: "user-1",
            userDisplayName: "Alex PM",
            entryDate: "2026-03-03T00:00:00.000Z",
            hours: 8,
            billableStatus: "billable"
          }
        ]
      })
    });
    assert.equal(ingest.status, 201);

    const weekly = await fetch(`${base}/api/workflows/weekly-time-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: "tenant-acme", projectId: "project-alpha" })
    });
    assert.equal(weekly.status, 200);
    const weeklyBody = (await weekly.json()) as any;
    assert.equal(weeklyBody.workflowId, "weekly_time_report");
    assert.ok(typeof weeklyBody.totalHours === "number");

    const monthly = await fetch(`${base}/api/workflows/monthly-billing-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: "tenant-acme", projectId: "project-alpha", month: 3, year: 2026 })
    });
    assert.equal(monthly.status, 200);
    const monthlyBody = (await monthly.json()) as any;
    assert.equal(monthlyBody.workflowId, "monthly_billing_summary");
    assert.ok(typeof monthlyBody.billableRatio === "number");
  } finally {
    server.close();
  }
});
