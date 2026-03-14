import assert from "node:assert/strict";
import test from "node:test";
import { WorkflowRegistry } from "../src/core/services/workflows/workflowRegistry.js";
import { AgentPlannerService } from "../src/core/services/agentic/AgentPlannerService.js";
import type { BaseWorkflow, WorkflowResult } from "../src/core/services/workflows/baseWorkflow.js";

function workflow(id: BaseWorkflow["id"]): BaseWorkflow {
  return {
    id,
    name: id,
    description: id,
    supportedInputTypes: ["text"],
    async execute(): Promise<WorkflowResult> {
      return {
        workflowId: id,
        resultType: "summary",
        data: { summary: id },
        generatedAt: new Date(),
        confidenceScore: 0.8,
        warnings: []
      };
    }
  };
}

test("AgentPlannerService selects single workflow for change request intent", () => {
  const registry = new WorkflowRegistry();
  registry.register(workflow("change_assessment"));
  registry.register(workflow("project_summary"));
  const planner = new AgentPlannerService(registry);

  const plan = planner.createPlan({
    tenantId: "tenant-test",
    projectId: "project-test",
    message: "Assess this change request for scope impact"
  });

  assert.equal(plan.steps.length, 1);
  assert.equal(plan.steps[0].workflowId, "change_assessment");
});

test("AgentPlannerService selects multi-workflow plan for executive summary with forecast and risks", () => {
  const registry = new WorkflowRegistry();
  registry.register(workflow("project_summary"));
  registry.register(workflow("forecast"));
  registry.register(workflow("delivery_advisor"));
  const planner = new AgentPlannerService(registry);

  const plan = planner.createPlan({
    tenantId: "tenant-test",
    projectId: "project-test",
    message: "Give me an executive summary with forecast and risks"
  });

  assert.ok(plan.steps.length >= 2);
  assert.equal(plan.steps[0].workflowId, "project_summary");
  assert.ok(plan.steps.some((step) => step.workflowId === "forecast"));
});

test("AgentPlannerService enforces bounded max step count", () => {
  const registry = new WorkflowRegistry();
  registry.register(workflow("project_summary"));
  registry.register(workflow("forecast"));
  registry.register(workflow("delivery_advisor"));
  registry.register(workflow("monthly_billing_summary"));
  registry.register(workflow("weekly_time_report"));
  const planner = new AgentPlannerService(registry);

  const plan = planner.createPlan({
    tenantId: "tenant-test",
    projectId: "project-test",
    message: "Executive summary with forecast, blockers, billable trend and utilization this month"
  });

  assert.ok(plan.steps.length <= plan.maxSteps);
});
