import { Router } from "express";
import {
  adminAuditService,
  connectorHealthService,
  featureFlagService,
  licenseService,
  promptRegistryService,
  tenantProvisioningService,
  tenantService,
  usageLogService
} from "../../context/platformContext.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";

export const adminTenantRoutes = Router();

adminTenantRoutes.post("/provision", requireAdminRole(["superadmin", "supportadmin"]), (req, res) => {
  const planType = req.body?.planType as "starter" | "professional" | "enterprise";
  if (!["starter", "professional", "enterprise"].includes(planType)) {
    return res.status(400).json({ error: "Invalid plan type" });
  }

  const tenantId = String(req.body?.tenantId ?? "").trim();
  const organizationName = String(req.body?.organizationName ?? "").trim();
  const enabledConnectors = Array.isArray(req.body?.enabledConnectors)
    ? req.body.enabledConnectors.filter((value: unknown): value is string => typeof value === "string")
    : [];

  if (!tenantId || !organizationName) {
    return res.status(400).json({ error: "tenantId and organizationName are required" });
  }

  try {
    const provisioned = tenantProvisioningService.provisionTenant({
      tenantId,
      organizationName,
      planType,
      enabledConnectors,
      primaryConnector: typeof req.body?.primaryConnector === "string" ? req.body.primaryConnector : undefined,
      trialMode: Boolean(req.body?.trialMode)
    });

    adminAuditService.record(req.adminUser!, "tenant.provision", tenantId, {
      planType,
      enabledConnectors,
      trialMode: Boolean(req.body?.trialMode)
    });
    res.status(201).json(provisioned);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to provision tenant";
    res.status(409).json({ error: message });
  }
});

adminTenantRoutes.get("/", requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]), (_req, res) => {
  const search = typeof _req.query.search === "string" ? _req.query.search.toLowerCase().trim() : "";
  const status = typeof _req.query.status === "string" ? _req.query.status : undefined;
  const planType = typeof _req.query.planType === "string" ? _req.query.planType : undefined;

  const rows = tenantService.listTenants().filter((tenant) => {
    if (search && !`${tenant.tenantId} ${tenant.organizationName}`.toLowerCase().includes(search)) {
      return false;
    }
    if (status && tenant.licenseStatus !== status) {
      return false;
    }
    if (planType && tenant.planType !== planType) {
      return false;
    }
    return true;
  });

  res.json(
    rows.map((tenant) => {
      const usage = usageLogService.listUsageByTenant(tenant.tenantId);
      const lastActivity = usage[usage.length - 1]?.timestamp ?? null;
      return {
        ...tenant,
        connectorStatus: connectorHealthService.listByTenant(tenant.tenantId),
        lastActivity
      };
    })
  );
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
    const failures = usage.filter((entry) => entry.success === false).slice(-10);
    const lastActivity = usage[usage.length - 1]?.timestamp ?? null;

    res.json({
      tenant,
      license: licenseService.getLicense(tenant.tenantId),
      connectorHealth: connectorHealthService.listByTenant(tenant.tenantId),
      featureFlags: featureFlagService.getFlagsForTenant(tenant.tenantId),
      promptAssignments: promptRegistryService.listTenantAssignments(tenant.tenantId),
      usageSummary: {
        totalRequests: usage.length,
        lastActivity,
        topWorkflows: usageLogService.topRequestTypesByTenant(tenant.tenantId, 5)
      },
      recentErrors: failures
    });
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
  if (!["starter", "professional", "enterprise"].includes(planType)) {
    return res.status(400).json({ error: "Invalid plan type" });
  }
  const updated = tenantService.assignPlanType(req.params.tenantId, planType);
  if (!updated) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  adminAuditService.record(req.adminUser!, "tenant.assignPlan", updated.tenantId, { planType });
  res.json(updated);
});
