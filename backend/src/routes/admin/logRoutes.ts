import { Router } from "express";
import { adminAuditService, usageLogService } from "../../context/platformContext.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";
import { connectorTelemetryService, workflowTelemetryService } from "../../observability/runtime.js";

export const adminLogRoutes = Router();

adminLogRoutes.get(
  "/requests",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const tenantId = typeof req.query.tenantId === "string" ? req.query.tenantId : undefined;
    const requestType = typeof req.query.requestType === "string" ? req.query.requestType : undefined;
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize ?? 50) || 50));

    const filtered = usageLogService
      .listRecent(1000)
      .filter((entry) => (tenantId ? entry.tenantId === tenantId : true))
      .filter((entry) => (requestType ? entry.requestType === requestType : true));
    const start = (page - 1) * pageSize;

    res.json({
      total: filtered.length,
      page,
      pageSize,
      items: filtered.slice(start, start + pageSize)
    });
  }
);

adminLogRoutes.get(
  "/tenant-usage/:tenantId",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    res.json(usageLogService.listUsageByTenant(req.params.tenantId));
  }
);

adminLogRoutes.get(
  "/admin-actions",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize ?? 50) || 50));
    const recent = adminAuditService.listRecent(1000);
    const start = (page - 1) * pageSize;

    res.json({
      total: recent.length,
      page,
      pageSize,
      items: recent.slice(start, start + pageSize)
    });
  }
);

adminLogRoutes.get(
  "/workflow-failures",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (_req, res) => {
    res.json({ items: workflowTelemetryService.failures(100) });
  }
);

adminLogRoutes.get(
  "/connector-failures",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (_req, res) => {
    res.json({ items: connectorTelemetryService.recentFailures(100) });
  }
);

adminLogRoutes.get(
  "/error-summary",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (_req, res) => {
    const recent = usageLogService.listRecent(1000).filter((entry) => entry.success === false);
    const counts = new Map<string, number>();
    for (const row of recent) {
      const key = row.errorMessage ?? "unknown_error";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const topErrorCategories = Array.from(counts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      totalFailures: recent.length,
      rateLimitedRequests: recent.filter((entry) => (entry.errorMessage ?? "").includes("429")).length,
      topErrorCategories
    });
  }
);
