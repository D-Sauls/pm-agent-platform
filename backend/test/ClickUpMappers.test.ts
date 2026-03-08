import assert from "node:assert/strict";
import test from "node:test";
import {
  mapClickUpProject,
  mapClickUpStatus,
  mapClickUpTask,
  mapClickUpTimeEntry
} from "../src/core/connectors/clickup/ClickUpMappers.js";

test("ClickUp mappers normalize project/task/time entry structures", () => {
  const project = mapClickUpProject(
    "tenant-acme",
    {
      id: "list-1",
      name: "Delivery Program",
      status: { status: "in progress" },
      space: { id: "s1", name: "Delivery" },
      folder: { id: "f1", name: "Core" }
    },
    {
      tenantId: "tenant-acme",
      connectorName: "clickup",
      authType: "api_key",
      listId: "list-1",
      isEnabled: true
    }
  );
  assert.equal(project.sourceSystem, "clickup");
  assert.equal(project.externalProjectId, "list-1");

  const task = mapClickUpTask("list-1", {
    id: "task-1",
    name: "Build feature",
    status: { status: "In Progress" },
    assignees: [{ id: "u1", username: "alice" }],
    due_date: String(Date.now())
  });
  assert.equal(task.assignee, "alice");

  const timeEntry = mapClickUpTimeEntry("tenant-acme", "list-1", {
    id: "te-1",
    user: { id: "u1", username: "alice" },
    task: { id: "task-1", name: "Build feature" },
    start: String(Date.now()),
    duration: String(3_600_000),
    billable: true
  });
  assert.equal(timeEntry.billableStatus, "billable");
  assert.equal(timeEntry.hours, 1);

  const status = mapClickUpStatus([
    { ...task, status: "Done" },
    { ...task, taskId: "task-2", status: "In Progress" }
  ]);
  assert.ok(["Green", "Amber", "Red"].includes(status));
});
