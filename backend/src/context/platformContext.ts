import { AdminAuthService } from "../services/AdminAuthService.js";
import { AdminAuditService } from "../services/AdminAuditService.js";
import { AdminDashboardService } from "../services/AdminDashboardService.js";
import { ConnectorHealthService } from "../services/ConnectorHealthService.js";
import { EnhancementRequestService } from "../services/EnhancementRequestService.js";
import { FeatureFlagService } from "../services/FeatureFlagService.js";
import { LicenseService } from "../services/LicenseService.js";
import { PromptRegistryService } from "../services/PromptRegistryService.js";
import { TenantService } from "../services/TenantService.js";
import { TenantProvisioningService } from "../services/TenantProvisioningService.js";
import { UsageLogService } from "../services/UsageLogService.js";

export const tenantService = new TenantService();
export const licenseService = new LicenseService();
export const usageLogService = new UsageLogService();
export const adminAuthService = new AdminAuthService();
export const adminAuditService = new AdminAuditService();
export const featureFlagService = new FeatureFlagService();
export const promptRegistryService = new PromptRegistryService();
export const enhancementRequestService = new EnhancementRequestService();
export const connectorHealthService = new ConnectorHealthService();
export const tenantProvisioningService = new TenantProvisioningService(
  tenantService,
  licenseService,
  featureFlagService,
  connectorHealthService,
  promptRegistryService
);
export const adminDashboardService = new AdminDashboardService(
  tenantService,
  adminAuditService,
  connectorHealthService,
  enhancementRequestService,
  usageLogService
);

for (const tenant of tenantService.listTenants()) {
  licenseService.initializeForTenant(tenant);
}
