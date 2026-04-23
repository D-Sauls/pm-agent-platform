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

test("AgentPlannerService selects next training workflow for onboarding intent", () => {
  const registry = new WorkflowRegistry();
  registry.register(workflow("next_training_step"));
  registry.register(workflow("onboarding_recommendation"));
  const planner = new AgentPlannerService(registry);

  const plan = planner.createPlan({
    tenantId: "tenant-test",
    message: "What should I do next in onboarding?"
  });

  assert.equal(plan.steps.length, 1);
  assert.equal(plan.steps[0].workflowId, "next_training_step");
});

test("AgentPlannerService selects compliance workflows for missing compliance intent", () => {
  const registry = new WorkflowRegistry();
  registry.register(workflow("compliance_audit"));
  registry.register(workflow("requirement_status"));
  const planner = new AgentPlannerService(registry);

  const plan = planner.createPlan({
    tenantId: "tenant-test",
    message: "What am I missing for compliance?"
  });

  assert.equal(plan.steps.length, 2);
  assert.equal(plan.steps[0].workflowId, "compliance_audit");
  assert.equal(plan.steps[1].workflowId, "requirement_status");
});

test("AgentPlannerService enforces bounded max step count", () => {
  const registry = new WorkflowRegistry();
  registry.register(workflow("next_training_step"));
  registry.register(workflow("onboarding_recommendation"));
  registry.register(workflow("course_recommendation"));
  registry.register(workflow("policy_lookup"));
  registry.register(workflow("knowledge_explain"));
  registry.register(workflow("compliance_audit"));
  registry.register(workflow("requirement_status"));
  const planner = new AgentPlannerService(registry);

  const plan = planner.createPlan({
    tenantId: "tenant-test",
    message: "What should I do next, what courses are required, explain policy, and what am I missing for compliance?"
  });

  assert.ok(plan.steps.length <= plan.maxSteps);
});
