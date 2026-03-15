import assert from "node:assert/strict";
import test from "node:test";
import { RoleProfileService } from "../src/core/services/onboarding/RoleProfileService.js";

test("RoleProfileService resolves role by tenant, role name, and department", () => {
  const service = new RoleProfileService();
  service.seed([
    {
      id: "role-finance-analyst",
      tenantId: "tenant-acme",
      roleName: "Finance Analyst",
      department: "Finance",
      description: "Finance analyst role"
    }
  ]);

  const role = service.findByRole("tenant-acme", "Finance Analyst", "Finance");
  assert.ok(role);
  assert.equal(role?.id, "role-finance-analyst");
});
