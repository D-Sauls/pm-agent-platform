import assert from "node:assert/strict";
import test from "node:test";
import { ReportingEngine } from "../src/core/services/ReportingEngine.js";
import { WeeklyReportWorkflowV2 } from "../src/core/services/workflows/weeklyReportWorkflow.js";
import { WorkflowRegistry } from "../src/core/services/workflows/workflowRegistry.js";
import { PromptEngine } from "../src/prompt/PromptEngine.js";

test("WorkflowRegistry registers and retrieves workflows", () => {
  const registry = new WorkflowRegistry();
  registry.register(new WeeklyReportWorkflowV2(new ReportingEngine(new PromptEngine())));
  const workflow = registry.getWorkflow("weekly_report");
  assert.equal(workflow.id, "weekly_report");
  assert.equal(registry.listWorkflows().length, 1);
});
