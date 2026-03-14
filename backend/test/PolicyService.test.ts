import assert from "node:assert/strict";
import test from "node:test";
import { PolicyService } from "../src/core/services/knowledge/PolicyService.js";

test("PolicyService looks up tenant policies by role and tag", () => {
  const service = new PolicyService();
  service.createPolicy({
    id: "policy-1",
    tenantId: "tenant-acme",
    title: "Finance Controls",
    category: "compliance",
    documentReference: "sharepoint://finance-controls.pdf",
    tags: ["finance", "controls"],
    applicableRoles: ["Finance Analyst"]
  });

  const matches = service.lookupPolicies("tenant-acme", { role: "Finance Analyst", tag: "finance" });
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.title, "Finance Controls");
});
