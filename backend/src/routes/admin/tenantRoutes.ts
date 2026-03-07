import { Router } from "express";
import { adminAuditService, tenantService, usageLogService } from "../../context/platformContext.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";

export const adminTenantRoutes = Router();

adminTenantRoutes.get("/", requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]), (_req, res) => {
  res.json(tenantService.listTenants());
});

adminTenantRoutes.get(
  "/:tenantId",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const tenant = tenantService.retrieveTenantContext(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    const usage = usageLogService.listUsageByTenant(tenant.tenantId);
    res.json({ tenant, usageSummary: { totalRequests: usage.length } });
  }
);

adminTenantRoutes.post("/:tenantId/suspend", requireAdminRole(["superadmin", "supportadmin"]), (req, res) => {
  const updated = tenantService.suspendTenant(req.params.tenantId);
  if (!updated) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  adminAuditService.record(req.adminUser!, "tenant.suspend", updated.tenantId);
  res.json(updated);
});

adminTenantRoutes.post("/:tenantId/reactivate", requireAdminRole(["superadmin", "supportadmin"]), (req, res) => {
  const updated = tenantService.reactivateTenant(req.params.tenantId);
  if (!updated) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  adminAuditService.record(req.adminUser!, "tenant.reactivate", updated.tenantId);
  res.json(updated);
});

adminTenantRoutes.post("/:tenantId/plan", requireAdminRole(["superadmin", "supportadmin"]), (req, res) => {
  const planType = req.body?.planType as "starter" | "professional" | "enterprise";
  const updated = tenantService.assignPlanType(req.params.tenantId, planType);
  if (!updated) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  adminAuditService.record(req.adminUser!, "tenant.assignPlan", updated.tenantId, { planType });
  res.json(updated);
});
