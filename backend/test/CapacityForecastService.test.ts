import assert from "node:assert/strict";
import test from "node:test";
import type { ForecastInput } from "../src/core/models/forecastModels.js";
import { CapacityForecastService } from "../src/core/services/forecast/CapacityForecastService.js";

test("CapacityForecastService flags overloaded users and computes utilization", () => {
  const service = new CapacityForecastService();
  const input: ForecastInput = {
    tenantId: "tenant-test",
    projectId: "project-test",
    tasks: [
      {
        taskId: "t1",
        projectId: "project-test",
        sourceSystem: "internal",
        title: "Task 1",
        assignee: "user1"
      },
      {
        taskId: "t2",
        projectId: "project-test",
        sourceSystem: "internal",
        title: "Task 2",
        assignee: "user1"
      },
      {
        taskId: "t3",
        projectId: "project-test",
        sourceSystem: "internal",
        title: "Task 3",
        assignee: "user2"
      }
    ],
    milestones: [],
    metadata: {
      capacityByUser: {
        user1: { availableHours: 20, estimatedHours: 30 },
        user2: { availableHours: 40, estimatedHours: 20 }
      }
    }
  };

  const result = service.calculate(input);
  assert.equal(result.capacityRisk, "high");
  assert.ok(result.overloadedUsers.includes("user1"));
  assert.ok(result.utilizationAverage > 0);
  assert.equal(result.snapshots.length, 2);
});
