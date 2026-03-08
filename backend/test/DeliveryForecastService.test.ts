import assert from "node:assert/strict";
import test from "node:test";
import type { ForecastInput } from "../src/core/models/forecastModels.js";
import { DeliveryForecastService } from "../src/core/services/forecast/DeliveryForecastService.js";

test("DeliveryForecastService classifies high risk when overdue, variance, and blockers exceed thresholds", () => {
  const service = new DeliveryForecastService();
  const now = new Date();
  const input: ForecastInput = {
    tenantId: "tenant-test",
    projectId: "project-test",
    tasks: [
      {
        taskId: "t1",
        projectId: "project-test",
        sourceSystem: "internal",
        title: "Overdue task 1",
        status: "in_progress",
        dueDate: new Date(now.getTime() - 7 * 86_400_000)
      },
      {
        taskId: "t2",
        projectId: "project-test",
        sourceSystem: "internal",
        title: "Overdue task 2",
        status: "open",
        dueDate: new Date(now.getTime() - 8 * 86_400_000)
      },
      {
        taskId: "t3",
        projectId: "project-test",
        sourceSystem: "internal",
        title: "Overdue task 3",
        status: "open",
        dueDate: new Date(now.getTime() - 10 * 86_400_000)
      },
      {
        taskId: "t4",
        projectId: "project-test",
        sourceSystem: "internal",
        title: "Overdue task 4",
        status: "open",
        dueDate: new Date(now.getTime() - 12 * 86_400_000)
      }
    ],
    milestones: [
      {
        milestoneId: "m1",
        projectId: "project-test",
        sourceSystem: "internal",
        title: "Release gate",
        status: "open",
        targetDate: new Date(now.getTime() - 12 * 86_400_000)
      }
    ],
    dependencies: [
      { dependencyId: "d1", projectId: "project-test", sourceSystem: "internal", title: "Dependency 1" },
      { dependencyId: "d2", projectId: "project-test", sourceSystem: "internal", title: "Dependency 2" },
      { dependencyId: "d3", projectId: "project-test", sourceSystem: "internal", title: "Dependency 3" }
    ]
  };

  const result = service.calculate(input);
  assert.equal(result.status, "red");
  assert.equal(result.riskLevel, "high");
  assert.ok(result.trend.overdueTasks >= 4);
  assert.ok((result.trend.milestoneVarianceDays ?? 0) >= 10);
});
