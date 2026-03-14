import assert from "node:assert/strict";
import test from "node:test";
import { licenseValidationMiddleware } from "../src/core/middleware/LicenseValidationMiddleware.js";
import { AppError } from "../src/core/errors/AppError.js";
import type { LicenseService } from "../src/core/services/LicenseService.js";
import type { PlanLimitService } from "../src/core/services/PlanLimitService.js";
import type { Tenant } from "../src/core/models/tenantModels.js";

const activeTenant: Tenant = {
  tenantId: "tenant-active",
  organizationName: "Active Org",
  status: "active",
  licenseStatus: "active",
  planType: "professional",
  createdDate: new Date(),
  updatedDate: new Date(),
  defaultPromptVersion: "weekly_report:v1",
  enabledConnectors: ["clickup"],
  featureFlags: []
};

test("licenseValidationMiddleware allows active tenants inside plan limits", async () => {
  let nextError: unknown = null;
  const middleware = licenseValidationMiddleware(
    {
      ensureTenantLicenseIsActive: async () => undefined
    } as LicenseService,
    {
      ensureWithinPlanLimits: () => undefined
    } as PlanLimitService
  );

  await middleware(
    { tenantContext: { tenant: activeTenant } } as never,
    {} as never,
    (error?: unknown) => {
      nextError = error ?? null;
    }
  );

  assert.equal(nextError, null);
});

test("licenseValidationMiddleware surfaces plan limit failures", async () => {
  let nextError: unknown = null;
  const middleware = licenseValidationMiddleware(
    {
      ensureTenantLicenseIsActive: async () => undefined
    } as LicenseService,
    {
      ensureWithinPlanLimits: () => {
        throw new AppError("PLAN_LIMIT_EXCEEDED", "Too many connectors", 403);
      }
    } as PlanLimitService
  );

  await middleware(
    { tenantContext: { tenant: activeTenant } } as never,
    {} as never,
    (error?: unknown) => {
      nextError = error ?? null;
    }
  );

  assert.ok(nextError instanceof AppError);
  assert.equal((nextError as AppError).code, "PLAN_LIMIT_EXCEEDED");
});
