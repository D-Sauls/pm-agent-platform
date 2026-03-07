import { Router } from "express";
import { connectorHealthService } from "../../context/platformContext.js";
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
