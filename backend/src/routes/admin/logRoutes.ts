import { Router } from "express";
import { adminAuditService, usageLogService } from "../../context/platformContext.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";

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
