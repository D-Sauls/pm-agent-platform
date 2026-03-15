import { PromptEngine } from "../prompt/PromptEngine.js";
import { stubConnectors } from "./connectors/StubConnectors.js";
import { ClickUpConnector } from "./connectors/clickup/ClickUpConnector.js";
import type { Project, Project as ProjectModel } from "./models/projectModels.js";
import type { Course, KnowledgeDocument, LearningProgress, Policy } from "./models/knowledgeModels.js";
import type { OnboardingPath, RoleProfile } from "./models/onboardingModels.js";
import type {
  AcknowledgementRecord,
  ComplianceRequirement,
  CourseVersion,
  HROverrideRecord,
  PolicyVersion
} from "./models/complianceModels.js";
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
import { PlanLimitService } from "./services/PlanLimitService.js";
import { ProjectContextService } from "./services/ProjectContextService.js";
import { ReportingEngine } from "./services/ReportingEngine.js";
import { TenantContextService } from "./services/TenantContextService.js";
import { TenantService } from "./services/TenantService.js";
import { UsageLogService } from "./services/UsageLogService.js";
import { ForecastEngine } from "./services/forecast/ForecastEngine.js";
import { ConnectorConfigService } from "./services/connectors/ConnectorConfigService.js";
import { createDefaultSecretProvider } from "./services/connectors/SecretProvider.js";
import { GraphAuthService } from "./services/m365/GraphAuthService.js";
import { GraphClient } from "./services/m365/GraphClient.js";
import { SharePointConnector } from "./services/m365/SharePointConnector.js";
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
import { AgentPlannerService } from "./services/agentic/AgentPlannerService.js";
import { AgenticOrchestratorService } from "./services/agentic/AgenticOrchestratorService.js";
import { ResultSynthesisService } from "./services/agentic/ResultSynthesisService.js";
import { AcknowledgementService } from "./services/compliance/AcknowledgementService.js";
import { ComplianceConfigService } from "./services/compliance/ComplianceConfigService.js";
import { ComplianceReportService } from "./services/compliance/ComplianceReportService.js";
import { ComplianceRequirementService } from "./services/compliance/ComplianceRequirementService.js";
import { ComplianceTrackingService } from "./services/compliance/ComplianceTrackingService.js";
import { CourseVersionService } from "./services/compliance/CourseVersionService.js";
import { HROverrideService } from "./services/compliance/HROverrideService.js";
import { PolicyVersionService } from "./services/compliance/PolicyVersionService.js";
import { CourseService } from "./services/knowledge/CourseService.js";
import { KnowledgeIndexService } from "./services/knowledge/KnowledgeIndexService.js";
import { LearningProgressService } from "./services/knowledge/LearningProgressService.js";
import { LessonService } from "./services/knowledge/LessonService.js";
import { PolicyService } from "./services/knowledge/PolicyService.js";
import { RecommendationService } from "./services/knowledge/RecommendationService.js";
import { RoleProfileService } from "./services/onboarding/RoleProfileService.js";
import { OnboardingPathService } from "./services/onboarding/OnboardingPathService.js";
import { OnboardingRecommendationService } from "./services/onboarding/OnboardingRecommendationService.js";
import { OnboardingProgressService } from "./services/onboarding/OnboardingProgressService.js";
import { ComplianceAuditWorkflow } from "./services/workflows/complianceAuditWorkflow.js";
import { CourseRecommendationWorkflow } from "./services/workflows/courseRecommendationWorkflow.js";
import { KnowledgeExplainWorkflow } from "./services/workflows/knowledgeExplainWorkflow.js";
import { KnowledgeDocumentSummaryWorkflow } from "./services/workflows/knowledgeDocumentSummaryWorkflow.js";
import { SharePointDocumentLookupWorkflow } from "./services/workflows/sharePointDocumentLookupWorkflow.js";
import { LearningProgressWorkflow } from "./services/workflows/learningProgressWorkflow.js";
import { PolicyLookupWorkflow } from "./services/workflows/policyLookupWorkflow.js";
import { OnboardingRecommendationWorkflow } from "./services/workflows/onboardingRecommendationWorkflow.js";
import { NextTrainingStepWorkflow } from "./services/workflows/nextTrainingStepWorkflow.js";
import { RoleKnowledgeLookupWorkflow } from "./services/workflows/roleKnowledgeLookupWorkflow.js";
import { RequirementStatusWorkflow } from "./services/workflows/requirementStatusWorkflow.js";

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
export const planLimitServiceV2 = new PlanLimitService();
export const usageLogServiceV2 = new UsageLogService(usageLogRepository);
export const connectorConfigServiceV2 = new ConnectorConfigService(
  connectorConfigRepository,
  createDefaultSecretProvider()
);
export const graphAuthServiceV2 = new GraphAuthService();
export const graphClientV2 = new GraphClient();
export const clickUpConnectorV2 = new ClickUpConnector(connectorConfigServiceV2);
export const sharePointConnectorV2 = new SharePointConnector(
  connectorConfigServiceV2,
  graphAuthServiceV2,
  graphClientV2
);
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
export const courseServiceV2 = new CourseService();
export const learningProgressServiceV2 = new LearningProgressService();
export const lessonServiceV2 = new LessonService(courseServiceV2, learningProgressServiceV2);
export const policyServiceV2 = new PolicyService();
export const knowledgeIndexServiceV2 = new KnowledgeIndexService();
export const recommendationServiceV2 = new RecommendationService(courseServiceV2, policyServiceV2);
export const roleProfileServiceV2 = new RoleProfileService();
export const onboardingPathServiceV2 = new OnboardingPathService();
export const complianceConfigServiceV2 = new ComplianceConfigService();
export const policyVersionServiceV2 = new PolicyVersionService();
export const courseVersionServiceV2 = new CourseVersionService();
export const acknowledgementServiceV2 = new AcknowledgementService();
export const complianceRequirementServiceV2 = new ComplianceRequirementService();
export const onboardingRecommendationServiceV2 = new OnboardingRecommendationService(
  roleProfileServiceV2,
  onboardingPathServiceV2,
  courseServiceV2,
  policyServiceV2,
  complianceRequirementServiceV2
);
export const onboardingProgressServiceV2 = new OnboardingProgressService(
  onboardingPathServiceV2,
  learningProgressServiceV2,
  acknowledgementServiceV2,
  courseServiceV2,
  policyServiceV2
);
export const complianceTrackingServiceV2 = new ComplianceTrackingService();
export const hrOverrideServiceV2 = new HROverrideService();
export const complianceReportServiceV2 = new ComplianceReportService();
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
workflowRegistry.register(new CourseRecommendationWorkflow(recommendationServiceV2));
workflowRegistry.register(new OnboardingRecommendationWorkflow(onboardingRecommendationServiceV2));
workflowRegistry.register(
  new NextTrainingStepWorkflow(onboardingRecommendationServiceV2, onboardingProgressServiceV2)
);
workflowRegistry.register(
  new RoleKnowledgeLookupWorkflow(onboardingRecommendationServiceV2, sharePointConnectorV2)
);
workflowRegistry.register(new PolicyLookupWorkflow(policyServiceV2));
workflowRegistry.register(new SharePointDocumentLookupWorkflow(sharePointConnectorV2, knowledgeIndexServiceV2));
workflowRegistry.register(
  new KnowledgeDocumentSummaryWorkflow(sharePointConnectorV2, knowledgeIndexServiceV2, new PromptEngine())
);
workflowRegistry.register(new LearningProgressWorkflow(courseServiceV2, learningProgressServiceV2));
workflowRegistry.register(new KnowledgeExplainWorkflow(knowledgeIndexServiceV2, new PromptEngine()));
workflowRegistry.register(
  new ComplianceAuditWorkflow(
    complianceRequirementServiceV2,
    acknowledgementServiceV2,
    complianceTrackingServiceV2,
    complianceReportServiceV2,
    complianceConfigServiceV2
  )
);
workflowRegistry.register(
  new RequirementStatusWorkflow(
    complianceRequirementServiceV2,
    acknowledgementServiceV2,
    complianceTrackingServiceV2,
    complianceConfigServiceV2
  )
);
export const agentPlanner = new AgentPlanner();
export const agentOrchestratorV2 = new AgentOrchestrator(
  agentPlanner,
  workflowRegistry,
  tenantContextServiceV2,
  projectContextServiceV2
);
export const agentPlannerServiceV2 = new AgentPlannerService(workflowRegistry);
export const resultSynthesisServiceV2 = new ResultSynthesisService();
export const agenticOrchestratorServiceV2 = new AgenticOrchestratorService(
  agentPlannerServiceV2,
  workflowRegistry,
  tenantContextServiceV2,
  projectContextServiceV2,
  projectRepository,
  resultSynthesisServiceV2
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
      enabledConnectors: ["clickup", "monday", "planner", "sharepoint"],
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
    },
    {
      tenantId: "tenant-acme",
      connectorName: "sharepoint",
      authType: "oauth",
      siteId: "acme-hr-site",
      driveId: "policies-library",
      isEnabled: true,
      metadata: {
        directoryTenantId: "contoso.onmicrosoft.com",
        note: "Set SHAREPOINT_CLIENT_ID / SHAREPOINT_CLIENT_SECRET or GRAPH_CLIENT_ID / GRAPH_CLIENT_SECRET for live Graph calls.",
        sampleLibraries: [
          { id: "policies-library", driveId: "policies-library", siteId: "acme-hr-site", name: "Policy Library", webUrl: "https://contoso.sharepoint.com/sites/hr/Shared%20Documents" }
        ],
        sampleDocuments: [
          {
            id: "sp-doc-security-handbook",
            title: "Security Awareness Handbook",
            tags: ["security", "mandatory", "onboarding"],
            roleTargets: ["Finance Analyst", "Engineering", "Operations"],
            documentUrl: "https://contoso.sharepoint.com/sites/hr/Shared%20Documents/Security-Awareness-Handbook.docx",
            contentReference: "sharepoint://sites/hr/documents/security-awareness-handbook",
            siteId: "acme-hr-site",
            driveId: "policies-library",
            libraryId: "policies-library",
            summary: "Corporate guidance for phishing awareness, acceptable use, and mandatory annual acknowledgement.",
            webUrl: "https://contoso.sharepoint.com/sites/hr/Shared%20Documents/Security-Awareness-Handbook.docx",
            metadata: { owner: "Security Team", classification: "internal" }
          },
          {
            id: "sp-doc-leave-standard",
            title: "Leave Standard Operating Guide",
            tags: ["hr", "leave", "policy"],
            roleTargets: ["Finance Analyst", "Engineering", "Operations"],
            documentUrl: "https://contoso.sharepoint.com/sites/hr/Shared%20Documents/Leave-Standard-Operating-Guide.pdf",
            contentReference: "sharepoint://sites/hr/documents/leave-standard-operating-guide",
            siteId: "acme-hr-site",
            driveId: "policies-library",
            libraryId: "policies-library",
            summary: "Explains leave request timelines, approval routing, and manager responsibilities.",
            webUrl: "https://contoso.sharepoint.com/sites/hr/Shared%20Documents/Leave-Standard-Operating-Guide.pdf",
            metadata: { owner: "People Operations", classification: "internal" }
          }
        ]
      }
    }
  ];
  const sharePointDocuments: KnowledgeDocument[] = [
    {
      id: "sp-doc-security-handbook",
      tenantId: "tenant-acme",
      sourceSystem: "sharepoint",
      title: "Security Awareness Handbook",
      tags: ["security", "mandatory", "onboarding"],
      roleTargets: ["Finance Analyst", "Engineering", "Operations"],
      documentUrl: "https://contoso.sharepoint.com/sites/hr/Shared%20Documents/Security-Awareness-Handbook.docx",
      contentReference: "sharepoint://sites/hr/documents/security-awareness-handbook",
      siteId: "acme-hr-site",
      driveId: "policies-library",
      libraryId: "policies-library",
      summary: "Corporate guidance for phishing awareness, acceptable use, and mandatory annual acknowledgement.",
      webUrl: "https://contoso.sharepoint.com/sites/hr/Shared%20Documents/Security-Awareness-Handbook.docx",
      metadata: { owner: "Security Team", classification: "internal" }
    },
    {
      id: "sp-doc-leave-standard",
      tenantId: "tenant-acme",
      sourceSystem: "sharepoint",
      title: "Leave Standard Operating Guide",
      tags: ["hr", "leave", "policy"],
      roleTargets: ["Finance Analyst", "Engineering", "Operations"],
      documentUrl: "https://contoso.sharepoint.com/sites/hr/Shared%20Documents/Leave-Standard-Operating-Guide.pdf",
      contentReference: "sharepoint://sites/hr/documents/leave-standard-operating-guide",
      siteId: "acme-hr-site",
      driveId: "policies-library",
      libraryId: "policies-library",
      summary: "Explains leave request timelines, approval routing, and manager responsibilities.",
      webUrl: "https://contoso.sharepoint.com/sites/hr/Shared%20Documents/Leave-Standard-Operating-Guide.pdf",
      metadata: { owner: "People Operations", classification: "internal" }
    }
  ];
  const courses: Course[] = [
    {
      id: "course-finance-onboarding",
      tenantId: "tenant-acme",
      title: "Finance Analyst Onboarding",
      description: "Core onboarding path for finance analysts covering controls, reporting, and compliance.",
      tags: ["finance", "onboarding", "controls"],
      roleTargets: ["Finance Analyst"],
      publishedStatus: "published",
      modules: [
        {
          id: "module-finance-basics",
          courseId: "course-finance-onboarding",
          title: "Finance Foundations",
          lessons: [
            {
              id: "lesson-finance-policy",
              moduleId: "module-finance-basics",
              title: "Finance Policy Overview",
              contentType: "markdown",
              contentReference: "/content/finance-policy-overview.md",
              estimatedDuration: 15
            },
            {
              id: "lesson-quarterly-close",
              moduleId: "module-finance-basics",
              title: "Quarterly Close Walkthrough",
              contentType: "video",
              contentReference: "https://learning.example.com/quarterly-close",
              estimatedDuration: 20
            }
          ]
        }
      ]
    },
    {
      id: "course-security-awareness",
      tenantId: "tenant-acme",
      title: "Security Awareness Essentials",
      description: "Mandatory security awareness training for all employees.",
      tags: ["security", "mandatory", "onboarding"],
      roleTargets: ["Finance Analyst", "Engineering", "Operations"],
      publishedStatus: "published",
      modules: [
        {
          id: "module-security-basics",
          courseId: "course-security-awareness",
          title: "Security Basics",
          lessons: [
            {
              id: "lesson-phishing-awareness",
              moduleId: "module-security-basics",
              title: "Phishing Awareness",
              contentType: "markdown",
              contentReference: "/content/phishing-awareness.md",
              estimatedDuration: 12
            },
            {
              id: "lesson-incident-reporting",
              moduleId: "module-security-basics",
              title: "Incident Reporting",
              contentType: "pdf",
              contentReference: "/content/incident-reporting.pdf",
              estimatedDuration: 10
            }
          ]
        }
      ]
    }
  ];
  const policies: Policy[] = [
    {
      id: "policy-finance-controls",
      tenantId: "tenant-acme",
      title: "Finance Controls Policy",
      category: "compliance",
      documentReference: "sharepoint://policies/finance-controls.pdf",
      tags: ["finance", "controls", "compliance"],
      applicableRoles: ["Finance Analyst", "Finance"]
    },
    {
      id: "policy-security-awareness",
      tenantId: "tenant-acme",
      title: "Security Awareness Policy",
      category: "security",
      documentReference: "sharepoint://policies/security-awareness.pdf",
      tags: ["security", "mandatory"],
      applicableRoles: ["Finance Analyst", "Engineering", "Operations"]
    },
    {
      id: "policy-leave-policy",
      tenantId: "tenant-acme",
      title: "Employee Leave Policy",
      category: "hr",
      documentReference: "sharepoint://policies/leave-policy.pdf",
      tags: ["hr", "leave", "benefits"],
      applicableRoles: ["Finance Analyst", "Engineering", "Operations"]
    }
  ];
  const roleProfiles: RoleProfile[] = [
    {
      id: "role-finance-analyst",
      tenantId: "tenant-acme",
      roleName: "Finance Analyst",
      department: "Finance",
      description: "Analyst role responsible for controls, reporting, and monthly close support."
    }
  ];
  const onboardingPaths: OnboardingPath[] = [
    {
      id: "onboarding-finance-analyst-v1",
      tenantId: "tenant-acme",
      roleId: "role-finance-analyst",
      courseIds: ["course-finance-onboarding", "course-security-awareness"],
      policyIds: ["policy-finance-controls", "policy-security-awareness"],
      estimatedDuration: 210,
      version: "v1"
    }
  ];
  const progressEntries: LearningProgress[] = [
    {
      userId: "user-fin-1",
      courseId: "course-finance-onboarding",
      moduleId: "module-finance-basics",
      lessonId: "lesson-finance-policy",
      completionStatus: "completed",
      completionDate: new Date()
    }
  ];
  const policyVersions: PolicyVersion[] = [
    {
      id: "policy-version-finance-controls-v1",
      policyId: "policy-finance-controls",
      tenantId: "tenant-acme",
      versionLabel: "v1",
      documentReference: "sharepoint://policies/finance-controls-v1.pdf",
      effectiveDate: new Date(),
      publishedBy: "admin@local.dev",
      publishedAt: new Date(),
      isCurrent: true,
      changeSummary: "Initial published finance controls policy."
    }
  ];
  const courseVersions: CourseVersion[] = [
    {
      id: "course-version-finance-onboarding-v1",
      courseId: "course-finance-onboarding",
      tenantId: "tenant-acme",
      versionLabel: "v1",
      publishedBy: "admin@local.dev",
      publishedAt: new Date(),
      isCurrent: true,
      changeSummary: "Initial onboarding release."
    },
    {
      id: "course-version-security-awareness-v1",
      courseId: "course-security-awareness",
      tenantId: "tenant-acme",
      versionLabel: "v1",
      publishedBy: "admin@local.dev",
      publishedAt: new Date(),
      isCurrent: true,
      changeSummary: "Initial mandatory security training release."
    }
  ];
  const acknowledgementRecords: AcknowledgementRecord[] = [
    {
      id: "ack-finance-controls-user-fin-1",
      tenantId: "tenant-acme",
      userId: "user-fin-1",
      subjectType: "policy",
      subjectId: "policy-finance-controls",
      subjectVersionId: "policy-version-finance-controls-v1",
      acknowledgementType: "accepted",
      status: "completed",
      actorId: "user-fin-1",
      actorRole: "employee",
      recordedAt: new Date()
    }
  ];
  const complianceRequirements: ComplianceRequirement[] = [
    {
      id: "req-security-awareness",
      tenantId: "tenant-acme",
      requirementType: "policy",
      requirementId: "policy-security-awareness",
      appliesToRoles: ["Finance Analyst"],
      appliesToDepartments: ["Finance"],
      mandatory: true,
      dueInDays: 30,
      refresherPeriodDays: 365,
      acknowledgementRequired: true,
      signatureRequired: false
    },
    {
      id: "req-finance-onboarding",
      tenantId: "tenant-acme",
      requirementType: "course",
      requirementId: "course-finance-onboarding",
      appliesToRoles: ["Finance Analyst"],
      appliesToDepartments: ["Finance"],
      mandatory: true,
      dueInDays: 14,
      refresherPeriodDays: 365,
      acknowledgementRequired: true,
      signatureRequired: false
    }
  ];
  const hrOverrides: HROverrideRecord[] = [];

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
  courseServiceV2.seed(courses);
  roleProfileServiceV2.seed(roleProfiles);
  onboardingPathServiceV2.seed(onboardingPaths);
  policyServiceV2.seed(policies);
  knowledgeIndexServiceV2.indexCourses(courses);
  knowledgeIndexServiceV2.indexPolicies(policies);
  knowledgeIndexServiceV2.indexDocuments(sharePointDocuments);
  complianceConfigServiceV2.upsertConfig("tenant-acme", {
    acknowledgementRequiredDefault: true,
    signatureRequiredDefault: false,
    hrOverrideEnabled: true,
    refresherEnabled: true,
    defaultRefresherPeriodDays: 365,
    readReceiptMode: "acceptance_tracking",
    downloadPolicy: "authenticated_only",
    allowedIpRanges: []
  });
  for (const progress of progressEntries) {
    learningProgressServiceV2.recordProgress(progress);
  }
  for (const version of policyVersions) {
    policyVersionServiceV2.createVersion(version);
  }
  for (const version of courseVersions) {
    courseVersionServiceV2.createVersion(version);
  }
  for (const requirement of complianceRequirements) {
    complianceRequirementServiceV2.createRequirement(requirement);
  }
  for (const record of acknowledgementRecords) {
    acknowledgementServiceV2.recordAcknowledgement(
      record,
      complianceConfigServiceV2.getConfig(record.tenantId),
      false
    );
  }
  void hrOverrides;
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











