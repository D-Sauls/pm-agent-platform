import assert from "node:assert/strict";
import test from "node:test";
import { AdaptiveCardRenderer } from "../src/integrations/teams/AdaptiveCardRenderer.js";

test("AdaptiveCardRenderer renders adaptive card with metrics and recommendations", () => {
  const renderer = new AdaptiveCardRenderer();
  const card = renderer.render({
    workflowId: "weekly_time_report",
    confidenceScore: 0.9,
    connectorUsed: "clickup",
    result: {
      workflowId: "weekly_time_report",
      resultType: "weekly_time_report",
      generatedAt: new Date(),
      confidenceScore: 0.9,
      warnings: [],
      data: {
        totalHours: 10,
        billableHours: 8,
        nonBillableHours: 2,
        billableRatio: 0.8,
        recommendations: ["Review unknown effort entries"]
      }
    } as any
  });

  assert.equal(card.type, "AdaptiveCard");
  assert.ok(Array.isArray(card.body));
});
