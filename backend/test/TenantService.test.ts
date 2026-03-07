import assert from "node:assert/strict";
import test from "node:test";
import { createTestSystem } from "./helpers.js";

test("TenantService create/get/suspend/reactivate", async () => {
  const { tenantService } = await createTestSystem();
  const tenant = await tenantService.getTenantById("tenant-test");
  assert.equal(tenant.organizationName, "Test Org");

  await tenantService.suspendTenant("tenant-test");
  const suspended = await tenantService.getTenantById("tenant-test");
  assert.equal(suspended.status, "suspended");

  await tenantService.reactivateTenant("tenant-test");
  const active = await tenantService.getTenantById("tenant-test");
  assert.equal(active.status, "active");
});
