import { Router } from "express";
import {
  adminAuditService,
  licenseService,
  tenantService
} from "../../context/platformContext.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";

export const adminLicenseRoutes = Router();

adminLicenseRoutes.get("/", requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]), (_req, res) => {
  res.json(licenseService.listLicenses());
});

adminLicenseRoutes.get(
  "/:tenantId",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const license = licenseService.getLicense(req.params.tenantId);
    if (!license) {
      return res.status(404).json({ error: "License not found" });
    }
    res.json(license);
  }
);

adminLicenseRoutes.post("/:tenantId/activate", requireAdminRole(["superadmin"]), (req, res) => {
  const tenant = tenantService.retrieveTenantContext(req.params.tenantId);
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  const license = licenseService.activateLicense(tenant);
  tenantService.reactivateTenant(tenant.tenantId);
  adminAuditService.record(req.adminUser!, "license.activate", tenant.tenantId);
  res.json(license);
});

adminLicenseRoutes.post("/:tenantId/suspend", requireAdminRole(["superadmin"]), (req, res) => {
  const tenant = tenantService.retrieveTenantContext(req.params.tenantId);
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  const license = licenseService.suspendLicense(tenant);
  tenantService.suspendTenant(tenant.tenantId);
  adminAuditService.record(req.adminUser!, "license.suspend", tenant.tenantId);
  res.json(license);
});

adminLicenseRoutes.post("/:tenantId/trial", requireAdminRole(["superadmin"]), (req, res) => {
  const tenant = tenantService.retrieveTenantContext(req.params.tenantId);
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  const enabled = Boolean(req.body?.enabled);
  const license = licenseService.setTrialMode(tenant, enabled);
  adminAuditService.record(req.adminUser!, "license.trialMode", tenant.tenantId, { enabled });
  res.json(license);
});

adminLicenseRoutes.post("/:tenantId/expiry", requireAdminRole(["superadmin"]), (req, res) => {
  const tenant = tenantService.retrieveTenantContext(req.params.tenantId);
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  const expiryDate = String(req.body?.expiryDate ?? "");
  const license = licenseService.setExpiryDate(tenant, expiryDate);
  adminAuditService.record(req.adminUser!, "license.expiryDate", tenant.tenantId, { expiryDate });
  res.json(license);
});

adminLicenseRoutes.post("/:tenantId/validate", requireAdminRole(["superadmin", "supportadmin"]), (req, res) => {
  const tenant = tenantService.retrieveTenantContext(req.params.tenantId);
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  const result = licenseService.validateLicense(tenant);
  adminAuditService.record(req.adminUser!, "license.validate", tenant.tenantId, {
    latestValidationResult: result.latestValidationResult
  });
  res.json(result);
});
