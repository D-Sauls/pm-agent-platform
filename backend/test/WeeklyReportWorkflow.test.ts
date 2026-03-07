import assert from "node:assert/strict";
import test from "node:test";
import { createTestSystem } from "./helpers.js";

test("WeeklyReportWorkflow returns structured report", async () => {
  const { weeklyReportWorkflow } = await createTestSystem();
  const result = await weeklyReportWorkflow.execute({
    tenantId: "tenant-test",
    projectId: "project-test"
  });
  assert.ok(result.report.projectSummary.length > 0);
  assert.ok(Array.isArray(result.report.achievementsThisPeriod));
  assert.ok(result.report.generatedAt instanceof Date);
});
