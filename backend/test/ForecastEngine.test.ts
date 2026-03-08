import assert from "node:assert/strict";
import test from "node:test";
import type { ForecastInput } from "../src/core/models/forecastModels.js";
import { ForecastEngine } from "../src/core/services/forecast/ForecastEngine.js";

test("ForecastEngine orchestrates deterministic delivery, capacity, and billing forecasts", () => {
  const engine = new ForecastEngine();
  const now = new Date();
  const input: ForecastInput = {
    tenantId: "tenant-test",
    projectId: "project-test",
    tasks: [
      {
        taskId: "t1",
        projectId: "project-test",
        sourceSystem: "internal",
        title: "Task A",
        assignee: "user1",
        status: "in_progress",
        dueDate: new Date(now.getTime() - 2 * 86_400_000)
      },
      {
        taskId: "t2",
        projectId: "project-test",
        sourceSystem: "internal",
        title: "Task B",
        assignee: "user2",
        status: "done",
        dueDate: new Date(now.getTime() - 1 * 86_400_000)
      }
    ],
    milestones: [
      {
        milestoneId: "m1",
        projectId: "project-test",
        sourceSystem: "internal",
        title: "Milestone",
        status: "open",
        targetDate: new Date(now.getTime() - 6 * 86_400_000)
      }
    ],
    issues: [{ issueId: "i1", projectId: "project-test", sourceSystem: "internal", title: "Blocked by env" }],
    dependencies: [
      { dependencyId: "d1", projectId: "project-test", sourceSystem: "internal", title: "Security approval" }
    ],
    timeEntries: [
      {
        timeEntryId: "te1",
        tenantId: "tenant-test",
        projectId: "project-test",
        userId: "user1",
        date: new Date("2026-03-01T00:00:00.000Z"),
        hours: 7,
        billable: true
      },
      {
        timeEntryId: "te2",
        tenantId: "tenant-test",
        projectId: "project-test",
        userId: "user2",
        date: new Date("2026-03-02T00:00:00.000Z"),
        hours: 5,
        billable: false
      }
    ]
  };

  const result = engine.generate(input);
  assert.ok(["green", "amber", "red"].includes(result.deliveryForecast.status));
  assert.ok(["low", "medium", "high"].includes(result.capacityForecast.capacityRisk));
  assert.equal(result.billingForecast.totalHours, 12);
  assert.ok(result.confidenceScore >= 0.55);
  assert.ok(result.generatedAt instanceof Date);
});
