import { Router } from "express";
import { adminDashboardService, licenseService } from "../../context/platformContext.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";

export const adminDashboardRoutes = Router();

adminDashboardRoutes.get("/", requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]), (_req, res) => {
  const summary = adminDashboardService.buildSummary(licenseService.listLicenses());
  res.json(summary);
});
