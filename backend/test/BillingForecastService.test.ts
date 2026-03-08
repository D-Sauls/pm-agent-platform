import assert from "node:assert/strict";
import test from "node:test";
import type { ForecastInput } from "../src/core/models/forecastModels.js";
import { BillingForecastService } from "../src/core/services/forecast/BillingForecastService.js";

test("BillingForecastService computes billable ratio and projected effort", () => {
  const service = new BillingForecastService();
  const input: ForecastInput = {
    tenantId: "tenant-test",
    projectId: "project-test",
    tasks: [],
    milestones: [],
    timeEntries: [
      {
        timeEntryId: "te1",
        tenantId: "tenant-test",
        projectId: "project-test",
        userId: "u1",
        date: new Date("2026-03-01T00:00:00.000Z"),
        hours: 8,
        billable: true
      },
      {
        timeEntryId: "te2",
        tenantId: "tenant-test",
        projectId: "project-test",
        userId: "u1",
        date: new Date("2026-03-02T00:00:00.000Z"),
        hours: 6,
        billable: false
      },
      {
        timeEntryId: "te3",
        tenantId: "tenant-test",
        projectId: "project-test",
        userId: "u2",
        date: new Date("2026-03-03T00:00:00.000Z"),
        hours: 6,
        billable: true
      }
    ]
  };

  const result = service.calculate(input);
  assert.equal(result.totalHours, 20);
  assert.equal(result.billableHours, 14);
  assert.equal(result.nonBillableHours, 6);
  assert.equal(result.billableRatio, 0.7);
  assert.ok(result.projectedWeeklyHours > 0);
  assert.ok(result.projectedMonthlyHours > result.projectedWeeklyHours);
});
