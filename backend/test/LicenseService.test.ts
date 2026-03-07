import assert from "node:assert/strict";
import test from "node:test";
import { createTestSystem } from "./helpers.js";

test("LicenseService validates active license", async () => {
  const { licenseService } = await createTestSystem();
  const result = await licenseService.validateTenantLicenseStatus("tenant-test");
  assert.equal(result.valid, true);
  assert.equal(result.status, "active");
});
