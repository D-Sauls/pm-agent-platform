import { LicenseService } from "../services/LicenseService.js";
import { TenantService } from "../services/TenantService.js";
import { UsageLogService } from "../services/UsageLogService.js";

export const tenantService = new TenantService();
export const licenseService = new LicenseService();
export const usageLogService = new UsageLogService();
