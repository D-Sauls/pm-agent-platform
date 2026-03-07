import { PromptEngine } from "../src/prompt/PromptEngine.js";
import { stubConnectors } from "../src/core/connectors/StubConnectors.js";
import {
  MemoryLicenseRepository,
  MemoryProjectRepository,
  MemoryPromptMappingRepository,
  MemoryTenantRepository,
  MemoryUsageLogRepository
} from "../src/core/repositories/memory/MemoryRepositories.js";
import { ConnectorRouter } from "../src/core/services/ConnectorRouter.js";
import { LicenseService } from "../src/core/services/LicenseService.js";
import { ProjectContextService } from "../src/core/services/ProjectContextService.js";
import { ReportingEngine } from "../src/core/services/ReportingEngine.js";
import { TenantContextService } from "../src/core/services/TenantContextService.js";
import { TenantService } from "../src/core/services/TenantService.js";
import { UsageLogService } from "../src/core/services/UsageLogService.js";
import { WeeklyReportWorkflow } from "../src/core/workflows/WeeklyReportWorkflow.js";

export async function createTestSystem() {
  const tenantRepository = new MemoryTenantRepository();
  const licenseRepository = new MemoryLicenseRepository();
  const projectRepository = new MemoryProjectRepository();
  const promptMappingRepository = new MemoryPromptMappingRepository();
  const usageLogRepository = new MemoryUsageLogRepository();

  const tenantService = new TenantService(tenantRepository, licenseRepository, promptMappingRepository);
  const licenseService = new LicenseService(licenseRepository, tenantRepository);
  const tenantContextService = new TenantContextService(tenantService, licenseService);
  const projectContextService = new ProjectContextService(
    projectRepository,
    new ConnectorRouter(stubConnectors)
  );
  const reportingEngine = new ReportingEngine(new PromptEngine());
  const weeklyReportWorkflow = new WeeklyReportWorkflow(
    tenantContextService,
    projectContextService,
    reportingEngine
  );
  const usageLogService = new UsageLogService(usageLogRepository);

  await tenantService.createTenant({
    tenantId: "tenant-test",
    organizationName: "Test Org",
    status: "active",
    licenseStatus: "active",
    planType: "professional",
    defaultPromptVersion: "weekly_report:v1",
    enabledConnectors: ["clickup"],
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
  await projectRepository.upsert({
    projectId: "project-test",
    tenantId: "tenant-test",
    sourceSystem: "clickup",
    externalProjectId: "ext-test",
    name: "Test Project",
    deliveryMode: "hybrid"
  });

  return {
    tenantService,
    licenseService,
    tenantContextService,
    projectContextService,
    weeklyReportWorkflow,
    usageLogService
  };
}
