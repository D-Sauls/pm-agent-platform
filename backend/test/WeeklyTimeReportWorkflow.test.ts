import assert from "node:assert/strict";
import test from "node:test";
import { PromptEngine } from "../src/prompt/PromptEngine.js";
import { MemoryResourceRepository, MemoryTimeEntryRepository } from "../src/core/repositories/memory/MemoryRepositories.js";
import { BillingClassificationService } from "../src/core/services/time/BillingClassificationService.js";
import { EffortSummaryService } from "../src/core/services/time/EffortSummaryService.js";
import { ResourceService } from "../src/core/services/time/ResourceService.js";
import { TimeEntryService } from "../src/core/services/time/TimeEntryService.js";
import { WeeklyTimeReportWorkflow } from "../src/core/services/workflows/weeklyTimeReportWorkflow.js";
import { createTestSystem } from "./helpers.js";

test("WeeklyTimeReportWorkflow returns structured weekly time summary", async () => {
  const { tenantContextService, projectContextService } = await createTestSystem();
  const tenantContext = await tenantContextService.resolve("tenant-test");
  const projectContext = await projectContextService.getProjectContext(tenantContext, "project-test");

  const timeEntryService = new TimeEntryService(
    new MemoryTimeEntryRepository(),
    new BillingClassificationService()
  );
  const resourceService = new ResourceService(new MemoryResourceRepository());
  await resourceService.upsert([
    { userId: "user-1", tenantId: "tenant-test", displayName: "User One" }
  ]);
  await timeEntryService.ingest([
    {
      timeEntryId: "wtr-1",
      tenantId: "tenant-test",
      projectId: "project-test",
      sourceSystem: "manual",
      userId: "user-1",
      userDisplayName: "User One",
      entryDate: new Date(),
      hours: 6,
      billableStatus: "billable"
    },
    {
      timeEntryId: "wtr-2",
      tenantId: "tenant-test",
      projectId: "project-test",
      sourceSystem: "manual",
      userId: "user-1",
      userDisplayName: "User One",
      entryDate: new Date(),
      hours: 2,
      billableStatus: "non_billable"
    }
  ]);

  const workflow = new WeeklyTimeReportWorkflow(
    timeEntryService,
    resourceService,
    new EffortSummaryService(),
    new PromptEngine()
  );
  const result = await workflow.execute({
    tenantContext,
    projectContext,
    userRequest: "show weekly time report",
    workflowId: "weekly_time_report",
    timestamp: new Date(),
    metadata: { projectId: "project-test" }
  });

  assert.equal(result.resultType, "weekly_time_report");
  const data = result.data as any;
  assert.equal(data.totalHours, 8);
  assert.equal(data.billableHours, 6);
  assert.ok(Array.isArray(data.resourceBreakdown));
  assert.ok(Array.isArray(data.recommendations));
});
