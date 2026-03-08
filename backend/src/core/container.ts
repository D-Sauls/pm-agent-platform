import { PromptEngine } from "../prompt/PromptEngine.js";
import { stubConnectors } from "./connectors/StubConnectors.js";
import { ClickUpConnector } from "./connectors/clickup/ClickUpConnector.js";
import type { Project, Project as ProjectModel } from "./models/projectModels.js";
import type { ConnectorConfig } from "./models/connectorModels.js";
import type { License, Tenant } from "./models/tenantModels.js";
import {
  MemoryAdminAuditLogRepository,
  MemoryConnectorConfigRepository,
  MemoryLicenseRepository,
  MemoryProjectRepository,
  MemoryPromptMappingRepository,
  MemoryResourceRepository,
  MemoryTenantRepository,
  MemoryTimeEntryRepository,
  MemoryUsageLogRepository
} from "./repositories/memory/MemoryRepositories.js";
import { ConnectorRouter } from "./services/ConnectorRouter.js";
import { ForecastService } from "./services/ForecastService.js";
import { LicenseService } from "./services/LicenseService.js";
import { ProjectContextService } from "./services/ProjectContextService.js";
import { ReportingEngine } from "./services/ReportingEngine.js";
import { TenantContextService } from "./services/TenantContextService.js";
import { TenantService } from "./services/TenantService.js";
import { UsageLogService } from "./services/UsageLogService.js";
import { ForecastEngine } from "./services/forecast/ForecastEngine.js";
import { ConnectorConfigService } from "./services/connectors/ConnectorConfigService.js";
import { EnvSecretProvider } from "./services/connectors/SecretProvider.js";
import { BillingClassificationService } from "./services/time/BillingClassificationService.js";
import { EffortSummaryService } from "./services/time/EffortSummaryService.js";
import { ResourceService } from "./services/time/ResourceService.js";
import { TimeEntryService } from "./services/time/TimeEntryService.js";
import { UtilizationService } from "./services/time/UtilizationService.js";
import { AgentOrchestrator } from "./services/workflows/agentOrchestrator.js";
import { AgentPlanner } from "./services/workflows/agentPlanner.js";
import { ChangeAssessmentWorkflow } from "./services/workflows/changeAssessmentWorkflow.js";
import { DeliveryAdvisorWorkflow } from "./services/workflows/deliveryAdvisorWorkflow.js";
import { ForecastWorkflow } from "./services/workflows/forecastWorkflow.js";
import { MonthlyBillingSummaryWorkflow } from "./services/workflows/monthlyBillingSummaryWorkflow.js";
import { ProjectSummaryWorkflow } from "./services/workflows/projectSummaryWorkflow.js";
import { RaidExtractionWorkflow } from "./services/workflows/raidExtractionWorkflow.js";
import { WeeklyTimeReportWorkflow } from "./services/workflows/weeklyTimeReportWorkflow.js";
import { WeeklyReportWorkflowV2 } from "./services/workflows/weeklyReportWorkflow.js";
import { WorkflowRegistry } from "./services/workflows/workflowRegistry.js";
import { WeeklyReportWorkflow } from "./workflows/WeeklyReportWorkflow.js";
import { connectorTelemetryService, retryPolicyService } from "../observability/runtime.js";

const tenantRepository = new MemoryTenantRepository();
const licenseRepository = new MemoryLicenseRepository();
const usageLogRepository = new MemoryUsageLogRepository();
const adminAuditLogRepository = new MemoryAdminAuditLogRepository();
const projectRepository = new MemoryProjectRepository();
const promptMappingRepository = new MemoryPromptMappingRepository();
const timeEntryRepository = new MemoryTimeEntryRepository();
const resourceRepository = new MemoryResourceRepository();
const connectorConfigRepository = new MemoryConnectorConfigRepository();

export const tenantServiceV2 = new TenantService(
  tenantRepository,
  licenseRepository,
  promptMappingRepository
);
export const licenseServiceV2 = new LicenseService(licenseRepository, tenantRepository);
export const usageLogServiceV2 = new UsageLogService(usageLogRepository);
export const connectorConfigServiceV2 = new ConnectorConfigService(
  connectorConfigRepository,
  new EnvSecretProvider()
);
export const clickUpConnectorV2 = new ClickUpConnector(connectorConfigServiceV2);
export const billingClassificationServiceV2 = new BillingClassificationService();
export const timeEntryServiceV2 = new TimeEntryService(
  timeEntryRepository,
  billingClassificationServiceV2
);
export const resourceServiceV2 = new ResourceService(resourceRepository);
export const utilizationServiceV2 = new UtilizationService();
export const effortSummaryServiceV2 = new EffortSummaryService(utilizationServiceV2);
export const connectorRouterV2 = new ConnectorRouter([
  clickUpConnectorV2,
  ...stubConnectors.filter((connector) => connector.sourceSystem !== "clickup")
]);
export const projectContextServiceV2 = new ProjectContextService(
  projectRepository,
  connectorRouterV2,
  timeEntryServiceV2,
  retryPolicyService,
  connectorTelemetryService
);
export const tenantContextServiceV2 = new TenantContextService(tenantServiceV2, licenseServiceV2);
export const reportingEngineV2 = new ReportingEngine(new PromptEngine());
export const forecastEngineV2 = new ForecastEngine();
export const forecastServiceV2 = new ForecastService(
  forecastEngineV2,
  usageLogServiceV2,
  projectContextServiceV2
);
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
workflowRegistry.register(new ForecastWorkflow(forecastServiceV2, new PromptEngine()));
workflowRegistry.register(
  new WeeklyTimeReportWorkflow(
    timeEntryServiceV2,
    resourceServiceV2,
    effortSummaryServiceV2,
    new PromptEngine()
  )
);
workflowRegistry.register(
  new MonthlyBillingSummaryWorkflow(
    timeEntryServiceV2,
    resourceServiceV2,
    effortSummaryServiceV2,
    new PromptEngine()
  )
);
workflowRegistry.register(new ProjectSummaryWorkflow(new PromptEngine()));
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
      sourceSystem: "monday",
      externalProjectId: "mo-001",
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
  const connectorConfigs: ConnectorConfig[] = [
    {
      tenantId: "tenant-acme",
      connectorName: "clickup",
      authType: "api_key",
      baseUrl: "https://api.clickup.com/api/v2",
      workspaceId: "workspace-acme",
      teamId: "team-acme",
      listId: "project-alpha",
      isEnabled: true,
      metadata: { note: "Set CLICKUP_API_KEY__TENANT_ACME for live calls." }
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
  for (const config of connectorConfigs) {
    await connectorConfigRepository.upsert(config);
  }
})();

export const repositories = {
  tenantRepository,
  licenseRepository,
  usageLogRepository,
  adminAuditLogRepository,
  projectRepository,
  promptMappingRepository,
  connectorConfigRepository,
  timeEntryRepository,
  resourceRepository
};
