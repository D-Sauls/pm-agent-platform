import assert from "node:assert/strict";
import test from "node:test";
import { MemoryRoleProfileRepository } from "../src/core/repositories/memory/MemoryRepositories.js";
import { RoleProfileService } from "../src/core/services/onboarding/RoleProfileService.js";

test("RoleProfileService resolves role by tenant, role name, and department", async () => {
  const repository = new MemoryRoleProfileRepository();
  const service = new RoleProfileService(repository);
  await service.create({
    id: "role-finance-analyst",
    tenantId: "tenant-acme",
    roleName: "Finance Analyst",
    department: "Finance",
    description: "Finance analyst role"
  });

  const role = await service.findByRole("tenant-acme", "Finance Analyst", "Finance");
  assert.ok(role);
  assert.equal(role?.id, "role-finance-analyst");
});
