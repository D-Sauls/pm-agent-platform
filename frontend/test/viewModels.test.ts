import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardCards, buildTrainingGroups, getPrimaryNavigation } from "../src/pwa/viewModels";

const courses = [
  {
    id: "course-a",
    tenantId: "tenant-acme",
    title: "Security Awareness",
    description: "Mandatory baseline security training",
    tags: ["mandatory"],
    roleTargets: ["Finance Analyst"],
    publishedStatus: "published",
    modules: []
  },
  {
    id: "course-b",
    tenantId: "tenant-acme",
    title: "Optional Excel Refresh",
    description: "Optional skill refresh",
    tags: ["optional"],
    roleTargets: [],
    publishedStatus: "published",
    modules: []
  }
] as any;

test("primary navigation stays focused on the core employee journey", () => {
  assert.deepEqual(
    getPrimaryNavigation().map((item) => item.label),
    ["Dashboard", "My Training", "Policies", "Downloads", "Compliance", "Assistant", "Profile"]
  );
});

test("dashboard cards summarize assigned, completed, overdue, and evidence counts", () => {
  const progress = {
    "course-a": { status: "completed" },
    "course-b": { status: "in_progress" }
  };
  const cards = buildDashboardCards(courses, progress, [{ status: "overdue" }], [{ id: "ack-1" }], "Finance Analyst");

  assert.equal(cards[0].value, 2);
  assert.equal(cards[1].value, 1);
  assert.equal(cards[2].value, 1);
  assert.equal(cards[3].value, 1);
});

test("training groups split assigned and completed courses correctly", () => {
  const groups = buildTrainingGroups(courses, { "course-a": { status: "completed" } }, "Finance Analyst");
  assert.equal(groups.assigned.length, 2);
  assert.equal(groups.completed.length, 1);
});
