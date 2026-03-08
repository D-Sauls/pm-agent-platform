import { Router } from "express";
import {
  adminAuditService,
  featureFlagService,
  tenantService
} from "../../context/platformContext.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";

export const adminFeatureFlagRoutes = Router();

adminFeatureFlagRoutes.get(
  "/",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (_req, res) => {
    res.json({ globalFlags: featureFlagService.listGlobalFlags() });
  }
);

adminFeatureFlagRoutes.get(
  "/:tenantId",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const tenant = featureFlagService.getFlagsForTenant(req.params.tenantId);
    const defaults = Object.fromEntries(
      featureFlagService.listGlobalFlags().map((flag) => [flag.key, flag.defaultEnabled])
    );
    const effective = {
      ...defaults,
      ...tenant.flags
    };
    res.json({ ...tenant, effectiveFlags: effective });
  }
);

adminFeatureFlagRoutes.post("/:tenantId", requireAdminRole(["superadmin"]), (req, res) => {
  const flagKey = String(req.body?.flagKey ?? "");
  const enabled = Boolean(req.body?.enabled);
  if (!featureFlagService.listGlobalFlags().some((flag) => flag.key === flagKey)) {
    return res.status(400).json({ error: "Unknown feature flag key" });
  }
  const updated = featureFlagService.setFlagForTenant(req.params.tenantId, flagKey, enabled);
  tenantService.setTenantFeatureFlags(updated.tenantId, updated.flags);
  adminAuditService.record(req.adminUser!, "featureFlag.tenantUpdate", req.params.tenantId, {
    flagKey,
    enabled
  });
  res.json(updated);
});

adminFeatureFlagRoutes.post("/default/:flagKey", requireAdminRole(["superadmin"]), (req, res) => {
  const enabled = Boolean(req.body?.enabled);
  const updated = featureFlagService.setGlobalDefault(req.params.flagKey, enabled);
  if (!updated) {
    return res.status(404).json({ error: "Flag not found" });
  }
  adminAuditService.record(req.adminUser!, "featureFlag.globalDefault", undefined, {
    flagKey: req.params.flagKey,
    enabled
  });
  res.json(updated);
});
