import { Router } from "express";
import { requireAdminAuth } from "../../middleware/AdminAuthMiddleware.js";
import { adminAuthRoutes } from "./authRoutes.js";
import { adminConnectorRoutes } from "./connectorRoutes.js";
import { adminComplianceRoutes } from "./complianceRoutes.js";
import { adminDashboardRoutes } from "./dashboardRoutes.js";
import { adminEnhancementRoutes } from "./enhancementRoutes.js";
import { adminFeatureFlagRoutes } from "./featureFlagRoutes.js";
import { adminHrImportRoutes } from "./hrImportRoutes.js";
import { adminLicenseRoutes } from "./licenseRoutes.js";
import { adminLogRoutes } from "./logRoutes.js";
import { adminPromptRoutes } from "./promptRoutes.js";
import { adminTenantRoutes } from "./tenantRoutes.js";

export const adminRoutes = Router();

adminRoutes.use("/auth", adminAuthRoutes);
adminRoutes.use(requireAdminAuth);
adminRoutes.use("/dashboard", adminDashboardRoutes);
adminRoutes.use("/tenants", adminTenantRoutes);
adminRoutes.use("/licenses", adminLicenseRoutes);
adminRoutes.use("/feature-flags", adminFeatureFlagRoutes);
adminRoutes.use("/prompts", adminPromptRoutes);
adminRoutes.use("/enhancements", adminEnhancementRoutes);
adminRoutes.use("/connectors", adminConnectorRoutes);
adminRoutes.use("/compliance", adminComplianceRoutes);
adminRoutes.use("/hr-import", adminHrImportRoutes);
adminRoutes.use("/logs", adminLogRoutes);
