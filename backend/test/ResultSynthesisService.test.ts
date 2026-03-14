import assert from "node:assert/strict";
import test from "node:test";
import { ResultSynthesisService } from "../src/core/services/agentic/ResultSynthesisService.js";
import type { WorkflowResult } from "../src/core/services/workflows/baseWorkflow.js";

test("ResultSynthesisService combines workflow outputs into coherent response", () => {
  const service = new ResultSynthesisService();
  const results: WorkflowResult[] = [
    {
      workflowId: "project_summary",
      resultType: "project_summary",
      data: {
        projectOverview: "Project Alpha is at risk.",
        keyAchievements: ["Completed sprint planning"],
        recommendedFocus: ["Escalate integration blocker"],
        assumptionsMade: ["Status data is current"],
        warnings: []
      } as any,
      generatedAt: new Date(),
      confidenceScore: 0.9,
      warnings: []
    },
    {
      workflowId: "forecast",
      resultType: "forecast",
      data: {
        forecastExplanation: "Delivery risk is amber due to overdue tasks.",
        recommendedActions: ["Rebaseline milestone dates"],
        assumptionsMade: ["Capacity remains stable"],
        warnings: []
      } as any,
      generatedAt: new Date(),
      confidenceScore: 0.85,
      warnings: []
    }
  ];

  const synthesized = service.synthesize(
    "Give me an executive summary with forecast and risks",
    results,
    []
  );

  assert.equal(synthesized.workflowsExecuted.length, 2);
  assert.ok(synthesized.synthesizedSummary.length > 0);
  assert.ok(synthesized.recommendedActions.includes("Rebaseline milestone dates"));
});
