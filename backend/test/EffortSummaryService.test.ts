import assert from "node:assert/strict";
import test from "node:test";
import type { Resource, TimeEntry } from "../src/core/models/timeModels.js";
import { EffortSummaryService } from "../src/core/services/time/EffortSummaryService.js";

test("EffortSummaryService summarizes billable and non-billable effort", () => {
  const service = new EffortSummaryService();
  const entries: TimeEntry[] = [
    {
      timeEntryId: "te-1",
      tenantId: "tenant-test",
      projectId: "project-test",
      sourceSystem: "manual",
      entryDate: new Date("2026-03-01"),
      hours: 6,
      billableStatus: "billable"
    },
    {
      timeEntryId: "te-2",
      tenantId: "tenant-test",
      projectId: "project-test",
      sourceSystem: "manual",
      entryDate: new Date("2026-03-02"),
      hours: 2,
      billableStatus: "non_billable",
      userId: "user-2",
      userDisplayName: "Ops Analyst"
    }
  ];
  const resources: Resource[] = [
    { userId: "user-2", tenantId: "tenant-test", displayName: "Ops Analyst" }
  ];

  const result = service.summarize(
    {
      tenantId: "tenant-test",
      projectId: "project-test",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-31")
    },
    entries,
    resources
  );

  assert.equal(result.summary.totalHours, 8);
  assert.equal(result.summary.billableHours, 6);
  assert.equal(result.summary.nonBillableHours, 2);
  assert.equal(result.summary.billableRatio, 0.75);
  assert.ok(result.resourceSummary.length >= 1);
});
