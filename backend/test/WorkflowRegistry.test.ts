import assert from "node:assert/strict";
import test from "node:test";
import type { BaseWorkflow, WorkflowResult } from "../src/core/services/workflows/baseWorkflow.js";
import { WorkflowRegistry } from "../src/core/services/workflows/workflowRegistry.js";

function workflow(id: BaseWorkflow["id"]): BaseWorkflow {
  return {
    id,
    name: id,
    description: id,
    supportedInputTypes: ["text"],
    async execute(): Promise<WorkflowResult> {
      return {
        workflowId: id,
        resultType: id as WorkflowResult["resultType"],
        data: { summary: id } as any,
        generatedAt: new Date(),
        confidenceScore: 0.8,
        warnings: []
      };
    }
  };
}

test("WorkflowRegistry registers and retrieves onboarding workflows", () => {
  const registry = new WorkflowRegistry();
  registry.register(workflow("next_training_step"));
  const registered = registry.getWorkflow("next_training_step");

  assert.equal(registered.id, "next_training_step");
  assert.equal(registry.listWorkflows().length, 1);
});
