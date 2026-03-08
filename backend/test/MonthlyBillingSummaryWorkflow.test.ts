import assert from "node:assert/strict";
import test from "node:test";
import { PromptEngine } from "../src/prompt/PromptEngine.js";
import { MemoryResourceRepository, MemoryTimeEntryRepository } from "../src/core/repositories/memory/MemoryRepositories.js";
import { BillingClassificationService } from "../src/core/services/time/BillingClassificationService.js";
import { EffortSummaryService } from "../src/core/services/time/EffortSummaryService.js";
import { ResourceService } from "../src/core/services/time/ResourceService.js";
import { TimeEntryService } from "../src/core/services/time/TimeEntryService.js";
import { MonthlyBillingSummaryWorkflow } from "../src/core/services/workflows/monthlyBillingSummaryWorkflow.js";
import { createTestSystem } from "./helpers.js";

test("MonthlyBillingSummaryWorkflow returns structured billing summary", async () => {
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
      timeEntryId: "mbs-1",
      tenantId: "tenant-test",
      projectId: "project-test",
      sourceSystem: "manual",
      userId: "user-1",
      userDisplayName: "User One",
      entryDate: new Date("2026-03-02T00:00:00.000Z"),
      hours: 10,
      billableStatus: "billable"
    },
    {
      timeEntryId: "mbs-2",
      tenantId: "tenant-test",
      projectId: "project-test",
      sourceSystem: "manual",
      userId: "user-1",
      userDisplayName: "User One",
      entryDate: new Date("2026-03-03T00:00:00.000Z"),
      hours: 2,
      billableStatus: "non_billable"
    }
  ]);

  const workflow = new MonthlyBillingSummaryWorkflow(
    timeEntryService,
    resourceService,
    new EffortSummaryService(),
    new PromptEngine()
  );
  const result = await workflow.execute({
    tenantContext,
    projectContext,
    userRequest: "show monthly billing summary",
    workflowId: "monthly_billing_summary",
    timestamp: new Date(),
    metadata: { projectId: "project-test", month: 3, year: 2026 }
  });

  assert.equal(result.resultType, "monthly_billing_summary");
  const data = result.data as any;
  assert.equal(data.totalHours, 12);
  assert.equal(data.billableHours, 10);
  assert.ok(Array.isArray(data.resourceBreakdown));
  assert.ok(Array.isArray(data.recommendations));
});
