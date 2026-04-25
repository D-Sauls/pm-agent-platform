import {
  MemoryLicenseRepository,
  MemoryPromptMappingRepository,
  MemoryTenantRepository,
  MemoryUsageLogRepository
} from "../src/core/repositories/memory/MemoryRepositories.js";
import { LicenseService } from "../src/core/services/LicenseService.js";
import { TenantContextService } from "../src/core/services/TenantContextService.js";
import { TenantService } from "../src/core/services/TenantService.js";
import { UsageLogService } from "../src/core/services/UsageLogService.js";

export async function createTestSystem() {
  const tenantRepository = new MemoryTenantRepository();
  const licenseRepository = new MemoryLicenseRepository();
  const promptMappingRepository = new MemoryPromptMappingRepository();
  const usageLogRepository = new MemoryUsageLogRepository();

  const tenantService = new TenantService(tenantRepository, licenseRepository, promptMappingRepository);
  const licenseService = new LicenseService(licenseRepository, tenantRepository);
  const tenantContextService = new TenantContextService(tenantService, licenseService);
  const usageLogService = new UsageLogService(usageLogRepository);

  await tenantService.createTenant({
    tenantId: "tenant-test",
    organizationName: "Test Org",
    status: "active",
    licenseStatus: "active",
    planType: "professional",
    defaultPromptVersion: "onboarding_assistant:v1",
    enabledConnectors: ["sharepoint"],
    featureFlags: []
  });
  await licenseRepository.upsert({
    tenantId: "tenant-test",
    status: "active",
    planType: "professional",
    expiryDate: null,
    trialEndsAt: null,
    lastValidatedAt: null
  });

  return {
    tenantService,
    licenseService,
    tenantContextService,
    usageLogService
  };
}
