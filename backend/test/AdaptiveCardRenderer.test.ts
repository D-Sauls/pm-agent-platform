import assert from "node:assert/strict";
import test from "node:test";
import { AdaptiveCardRenderer } from "../src/integrations/teams/AdaptiveCardRenderer.js";

test("AdaptiveCardRenderer renders adaptive card with metrics and recommendations", () => {
  const renderer = new AdaptiveCardRenderer();
  const card = renderer.render({
    planId: "plan-1",
    goalType: "next_training_step",
    plannerConfidence: 0.9,
    stopReason: "completed",
    stepExecutions: [],
    response: {
      goalSummary: "What should I do next?",
      workflowsExecuted: ["next_training_step"],
      synthesizedSummary: "Complete the next assigned lesson.",
      keyFindings: ["Lesson 3 is next"],
      recommendedActions: ["Open Lesson 3"],
      assumptionsMade: [],
      warnings: [],
      generatedAt: new Date()
    }
  });

  assert.equal(card.type, "AdaptiveCard");
  assert.ok(Array.isArray(card.body));
});
