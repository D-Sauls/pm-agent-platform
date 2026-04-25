import assert from "node:assert/strict";
import test from "node:test";
import { ResultSynthesisService } from "../src/core/services/agentic/ResultSynthesisService.js";
import type { WorkflowResult } from "../src/core/services/workflows/baseWorkflow.js";

test("ResultSynthesisService combines onboarding and compliance workflow outputs", () => {
  const service = new ResultSynthesisService();
  const results: WorkflowResult[] = [
    {
      workflowId: "next_training_step",
      resultType: "next_training_step",
      data: {
        summary: "Complete Kitchen Hygiene Lesson 3 next.",
        nextActions: ["Open the assigned course", "Complete the pending lesson"],
        warnings: []
      } as any,
      generatedAt: new Date(),
      confidenceScore: 0.9,
      warnings: []
    },
    {
      workflowId: "compliance_audit",
      resultType: "compliance_audit",
      data: {
        overallStatus: "pending",
        recommendedActions: ["Acknowledge Food Safety Policy v4"],
        assumptionsMade: ["Current assignments are in scope"],
        warnings: []
      } as any,
      generatedAt: new Date(),
      confidenceScore: 0.85,
      warnings: []
    }
  ];

  const synthesized = service.synthesize("What should I do next for onboarding and compliance?", results, []);

  assert.deepEqual(synthesized.workflowsExecuted, ["next_training_step", "compliance_audit"]);
  assert.ok(synthesized.synthesizedSummary.includes("next_training_step"));
  assert.ok(synthesized.keyFindings.includes("Complete Kitchen Hygiene Lesson 3 next."));
  assert.ok(synthesized.recommendedActions.includes("Acknowledge Food Safety Policy v4"));
});
