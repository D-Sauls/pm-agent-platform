import { Router } from "express";
import { adminAuditService, usageLogService } from "../../context/platformContext.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";

export const adminLogRoutes = Router();

adminLogRoutes.get(
  "/requests",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (_req, res) => {
    res.json(usageLogService.listRecent(200));
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
  (_req, res) => {
    res.json(adminAuditService.listRecent(200));
  }
);
