import { Router } from "express";
import { adminAuditService, connectorHealthService } from "../../context/platformContext.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";

export const adminConnectorRoutes = Router();

adminConnectorRoutes.get(
  "/",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
    if (tenantId) {
      return res.json(connectorHealthService.listByTenant(tenantId));
    }
    res.json(connectorHealthService.listAll());
  }
);

adminConnectorRoutes.post(
  "/:tenantId/:connectorName/test",
  requireAdminRole(["superadmin", "supportadmin"]),
  (req, res) => {
    const result = connectorHealthService.runManualHealthCheck(
      req.params.tenantId,
      req.params.connectorName
    );
    adminAuditService.record(req.adminUser!, "connector.healthTest", req.params.tenantId, {
      connectorName: req.params.connectorName
    });
    res.json(result);
  }
);
