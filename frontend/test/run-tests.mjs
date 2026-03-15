import assert from "node:assert/strict";
import { resolveAppSurface } from "../dist/surface.js";
import { resolveTenantBranding } from "../dist/pwa/branding.js";
import { buildDashboardCards, buildTrainingGroups, getPrimaryNavigation } from "../dist/pwa/viewModels.js";

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
];

assert.equal(resolveAppSurface("/admin"), "admin");
assert.equal(resolveAppSurface("/teams"), "teams");
assert.equal(resolveAppSurface("/"), "pwa");
assert.equal(resolveTenantBranding("tenant-acme").appName, "Acme Learning Hub");
assert.equal(resolveTenantBranding("unknown", "Contoso").logoText, "CO");
assert.deepEqual(
  getPrimaryNavigation().map((item) => item.label),
  ["Dashboard", "My Training", "Policies", "Downloads", "Compliance", "Assistant", "Profile"]
);
const cards = buildDashboardCards(courses, { "course-a": { status: "completed" }, "course-b": { status: "in_progress" } }, [{ status: "overdue" }], [{ id: "ack-1" }], "Finance Analyst");
assert.equal(cards[0].value, 2);
assert.equal(cards[1].value, 1);
assert.equal(cards[2].value, 1);
assert.equal(cards[3].value, 1);
const groups = buildTrainingGroups(courses, { "course-a": { status: "completed" } }, "Finance Analyst");
assert.equal(groups.assigned.length, 2);
assert.equal(groups.completed.length, 1);

console.log("frontend smoke tests passed");
