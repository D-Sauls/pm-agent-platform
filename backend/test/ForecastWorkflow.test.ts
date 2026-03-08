import assert from "node:assert/strict";
import test from "node:test";
import { ForecastEngine } from "../src/core/services/forecast/ForecastEngine.js";
import { ForecastService } from "../src/core/services/ForecastService.js";
import { ForecastWorkflow } from "../src/core/services/workflows/forecastWorkflow.js";
import { PromptEngine } from "../src/prompt/PromptEngine.js";
import { createTestSystem } from "./helpers.js";

test("ForecastWorkflow executes deterministic forecast and returns structured explanation", async () => {
  const { tenantContextService, projectContextService, usageLogService } = await createTestSystem();
  const tenantContext = await tenantContextService.resolve("tenant-test");
  const projectContext = await projectContextService.getProjectContext(tenantContext, "project-test");
  const forecastService = new ForecastService(new ForecastEngine(), usageLogService, projectContextService);
  const workflow = new ForecastWorkflow(forecastService, new PromptEngine());

  const result = await workflow.execute({
    tenantContext,
    projectContext,
    userRequest: "Forecast delivery risk",
    workflowId: "forecast",
    timestamp: new Date(),
    metadata: { forecastType: "delivery" }
  });

  assert.equal(result.workflowId, "forecast");
  assert.equal(result.resultType, "forecast");
  const data = result.data as any;
  assert.ok(["green", "amber", "red"].includes(data.deliveryForecast.status));
  assert.ok(typeof data.forecastExplanation === "string");
  assert.ok(Array.isArray(data.recommendedActions));
  assert.ok(data.generatedAt);
});

test("ForecastWorkflow includes billing forecast values from deterministic engine", async () => {
  const { tenantContextService, projectContextService, usageLogService } = await createTestSystem();
  const tenantContext = await tenantContextService.resolve("tenant-test");
  const projectContext = await projectContextService.getProjectContext(tenantContext, "project-test");
  const forecastService = new ForecastService(new ForecastEngine(), usageLogService, projectContextService);
  const workflow = new ForecastWorkflow(forecastService, new PromptEngine());

  const result = await workflow.execute({
    tenantContext,
    projectContext,
    userRequest: "Forecast billable hours this month",
    workflowId: "forecast",
    timestamp: new Date(),
    metadata: {
      forecastType: "billing",
      timeEntries: [
        {
          timeEntryId: "te1",
          tenantId: "tenant-test",
          projectId: "project-test",
          date: new Date("2026-03-01T00:00:00.000Z"),
          hours: 8,
          billable: true
        },
        {
          timeEntryId: "te2",
          tenantId: "tenant-test",
          projectId: "project-test",
          date: new Date("2026-03-02T00:00:00.000Z"),
          hours: 4,
          billable: false
        }
      ]
    }
  });

  const data = result.data as any;
  assert.equal(data.billingForecast.totalHours, 12);
  assert.equal(data.billingForecast.billableHours, 8);
});
