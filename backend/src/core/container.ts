import { PromptEngine } from "../prompt/PromptEngine.js";
import { stubConnectors } from "./connectors/StubConnectors.js";
import type { Project, Project as ProjectModel } from "./models/projectModels.js";
import type { License, Tenant } from "./models/tenantModels.js";
import {
  MemoryAdminAuditLogRepository,
  MemoryLicenseRepository,
  MemoryProjectRepository,
  MemoryPromptMappingRepository,
  MemoryTenantRepository,
  MemoryUsageLogRepository
} from "./repositories/memory/MemoryRepositories.js";
import { ConnectorRouter } from "./services/ConnectorRouter.js";
import { LicenseService } from "./services/LicenseService.js";
import { ProjectContextService } from "./services/ProjectContextService.js";
import { ReportingEngine } from "./services/ReportingEngine.js";
import { TenantContextService } from "./services/TenantContextService.js";
import { TenantService } from "./services/TenantService.js";
import { UsageLogService } from "./services/UsageLogService.js";
import { AgentOrchestrator } from "./services/workflows/agentOrchestrator.js";
import { AgentPlanner } from "./services/workflows/agentPlanner.js";
import { ChangeAssessmentWorkflow } from "./services/workflows/changeAssessmentWorkflow.js";
import { DeliveryAdvisorWorkflow } from "./services/workflows/deliveryAdvisorWorkflow.js";
import { ProjectSummaryWorkflow } from "./services/workflows/projectSummaryWorkflow.js";
import { RaidExtractionWorkflow } from "./services/workflows/raidExtractionWorkflow.js";
import { WeeklyReportWorkflowV2 } from "./services/workflows/weeklyReportWorkflow.js";
import { WorkflowRegistry } from "./services/workflows/workflowRegistry.js";
import { WeeklyReportWorkflow } from "./workflows/WeeklyReportWorkflow.js";

const tenantRepository = new MemoryTenantRepository();
const licenseRepository = new MemoryLicenseRepository();
const usageLogRepository = new MemoryUsageLogRepository();
const adminAuditLogRepository = new MemoryAdminAuditLogRepository();
const projectRepository = new MemoryProjectRepository();
const promptMappingRepository = new MemoryPromptMappingRepository();

export const tenantServiceV2 = new TenantService(
  tenantRepository,
  licenseRepository,
  promptMappingRepository
);
export const licenseServiceV2 = new LicenseService(licenseRepository, tenantRepository);
export const usageLogServiceV2 = new UsageLogService(usageLogRepository);
export const connectorRouterV2 = new ConnectorRouter(stubConnectors);
export const projectContextServiceV2 = new ProjectContextService(projectRepository, connectorRouterV2);
export const tenantContextServiceV2 = new TenantContextService(tenantServiceV2, licenseServiceV2);
export const reportingEngineV2 = new ReportingEngine(new PromptEngine());
export const weeklyReportWorkflow = new WeeklyReportWorkflow(
  tenantContextServiceV2,
  projectContextServiceV2,
  reportingEngineV2
);
export const workflowRegistry = new WorkflowRegistry();
workflowRegistry.register(new WeeklyReportWorkflowV2(reportingEngineV2));
workflowRegistry.register(new RaidExtractionWorkflow(new PromptEngine()));
workflowRegistry.register(new ChangeAssessmentWorkflow(new PromptEngine()));
workflowRegistry.register(new DeliveryAdvisorWorkflow(new PromptEngine()));
workflowRegistry.register(new ProjectSummaryWorkflow());
export const agentPlanner = new AgentPlanner();
export const agentOrchestratorV2 = new AgentOrchestrator(
  agentPlanner,
  workflowRegistry,
  tenantContextServiceV2,
  projectContextServiceV2
);

void (async () => {
  const tenants: Tenant[] = [
    {
      tenantId: "tenant-acme",
      organizationName: "Acme Corp",
      status: "active",
      licenseStatus: "active",
      planType: "enterprise",
      createdDate: new Date(),
      updatedDate: new Date(),
      defaultPromptVersion: "weekly_report:v1",
      enabledConnectors: ["clickup", "monday", "planner"],
      featureFlags: ["weeklyReportV2"],
      metadata: { region: "us" }
    },
    {
      tenantId: "tenant-beta",
      organizationName: "Beta Industries",
      status: "trial",
      licenseStatus: "trial",
      planType: "starter",
      createdDate: new Date(),
      updatedDate: new Date(),
      defaultPromptVersion: "weekly_report:v1",
      enabledConnectors: ["zoho"],
      featureFlags: [],
      metadata: { region: "eu" }
    }
  ];

  const licenses: License[] = [
    {
      tenantId: "tenant-acme",
      status: "active",
      planType: "enterprise",
      expiryDate: null,
      trialEndsAt: null,
      lastValidatedAt: null
    },
    {
      tenantId: "tenant-beta",
      status: "trial",
      planType: "starter",
      expiryDate: null,
      trialEndsAt: new Date(Date.now() + 7 * 86400_000),
      lastValidatedAt: null
    }
  ];

  const projects: Project[] = [
    {
      projectId: "project-alpha",
      tenantId: "tenant-acme",
      sourceSystem: "clickup",
      externalProjectId: "cu-001",
      name: "Alpha Delivery Program",
      deliveryMode: "hybrid",
      status: "On Track"
    },
    {
      projectId: "project-beta",
      tenantId: "tenant-beta",
      sourceSystem: "zoho",
      externalProjectId: "zo-001",
      name: "Beta Modernization",
      deliveryMode: "agile",
      status: "At Risk"
    }
  ];

  for (const tenant of tenants) {
    await tenantRepository.create(tenant);
    await promptMappingRepository.setDefaultPromptVersion(tenant.tenantId, tenant.defaultPromptVersion);
  }
  for (const license of licenses) {
    await licenseRepository.upsert(license);
  }
  for (const project of projects) {
    await projectRepository.upsert(project as ProjectModel);
  }
})();

export const repositories = {
  tenantRepository,
  licenseRepository,
  usageLogRepository,
  adminAuditLogRepository,
  projectRepository,
  promptMappingRepository
};
