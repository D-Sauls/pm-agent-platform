import assert from "node:assert/strict";
import test from "node:test";
import { createTestSystem } from "./helpers.js";
import { ReportingEngine } from "../src/core/services/ReportingEngine.js";
import { AgentOrchestrator } from "../src/core/services/workflows/agentOrchestrator.js";
import { AgentPlanner } from "../src/core/services/workflows/agentPlanner.js";
import { ChangeAssessmentWorkflow } from "../src/core/services/workflows/changeAssessmentWorkflow.js";
import { DeliveryAdvisorWorkflow } from "../src/core/services/workflows/deliveryAdvisorWorkflow.js";
import { ProjectSummaryWorkflow } from "../src/core/services/workflows/projectSummaryWorkflow.js";
import { RaidExtractionWorkflow } from "../src/core/services/workflows/raidExtractionWorkflow.js";
import { WeeklyReportWorkflowV2 } from "../src/core/services/workflows/weeklyReportWorkflow.js";
import { WorkflowRegistry } from "../src/core/services/workflows/workflowRegistry.js";
import { PromptEngine } from "../src/prompt/PromptEngine.js";

test("AgentOrchestrator selects and executes weekly report workflow", async () => {
  const { tenantContextService, projectContextService } = await createTestSystem();
  const registry = new WorkflowRegistry();
  registry.register(new WeeklyReportWorkflowV2(new ReportingEngine(new PromptEngine())));
  registry.register(new RaidExtractionWorkflow(new PromptEngine()));
  registry.register(new ChangeAssessmentWorkflow(new PromptEngine()));
  registry.register(new DeliveryAdvisorWorkflow(new PromptEngine()));
  registry.register(new ProjectSummaryWorkflow());

  const orchestrator = new AgentOrchestrator(
    new AgentPlanner(),
    registry,
    tenantContextService,
    projectContextService
  );

  const result = await orchestrator.execute({
    tenantId: "tenant-test",
    projectId: "project-test",
    message: "generate weekly report"
  });

  assert.equal(result.workflowId, "weekly_report");
  assert.equal(result.result.resultType, "report");
});
