import { PromptEngine } from "../prompt/PromptEngine.js";
import { Router } from "express";
import { z } from "zod";
import {
  agentOrchestratorV2,
  acknowledgementServiceV2,
  clickUpConnectorV2,
  complianceConfigServiceV2,
  complianceReportServiceV2,
  complianceRequirementServiceV2,
  complianceTrackingServiceV2,
  connectorConfigServiceV2,
  courseServiceV2,
  courseVersionServiceV2,
  effortSummaryServiceV2,
  forecastServiceV2,
  graphAuthServiceV2,
  hrOverrideServiceV2,
  knowledgeIndexServiceV2,
  sharePointConnectorV2,
  learningProgressServiceV2,
  onboardingPathServiceV2,
  onboardingProgressServiceV2,
  onboardingRecommendationServiceV2,
  lessonServiceV2,
  licenseServiceV2,
  planLimitServiceV2,
  policyServiceV2,
  policyVersionServiceV2,
  projectContextServiceV2,
  recommendationServiceV2,
  resourceServiceV2,
  tenantContextServiceV2,
  timeEntryServiceV2,
  usageLogServiceV2,
  weeklyReportWorkflow
} from "../core/container.js";
import { adminAuditService } from "../context/platformContext.js";
import { AppError } from "../core/errors/AppError.js";
import type { NormalizedProjectContext } from "../core/models/projectModels.js";
import type { TimeEntry } from "../core/models/timeModels.js";
import { requireAdminAuth } from "../middleware/AdminAuthMiddleware.js";
import { requireAdminRole } from "../middleware/AdminRoleMiddleware.js";
import { ChangeAssessmentWorkflow } from "../core/services/workflows/changeAssessmentWorkflow.js";
import { ComplianceAuditWorkflow } from "../core/services/workflows/complianceAuditWorkflow.js";
import { CourseRecommendationWorkflow } from "../core/services/workflows/courseRecommendationWorkflow.js";
import { DeliveryAdvisorWorkflow } from "../core/services/workflows/deliveryAdvisorWorkflow.js";
import { ForecastWorkflow } from "../core/services/workflows/forecastWorkflow.js";
import { KnowledgeExplainWorkflow } from "../core/services/workflows/knowledgeExplainWorkflow.js";
import { KnowledgeDocumentSummaryWorkflow } from "../core/services/workflows/knowledgeDocumentSummaryWorkflow.js";
import { SharePointDocumentLookupWorkflow } from "../core/services/workflows/sharePointDocumentLookupWorkflow.js";
import { LearningProgressWorkflow } from "../core/services/workflows/learningProgressWorkflow.js";
import { OnboardingRecommendationWorkflow } from "../core/services/workflows/onboardingRecommendationWorkflow.js";
import { NextTrainingStepWorkflow } from "../core/services/workflows/nextTrainingStepWorkflow.js";
import { RoleKnowledgeLookupWorkflow } from "../core/services/workflows/roleKnowledgeLookupWorkflow.js";
import { MonthlyBillingSummaryWorkflow } from "../core/services/workflows/monthlyBillingSummaryWorkflow.js";
import { PolicyLookupWorkflow } from "../core/services/workflows/policyLookupWorkflow.js";
import { ProjectSummaryWorkflow } from "../core/services/workflows/projectSummaryWorkflow.js";
import { RaidExtractionWorkflow } from "../core/services/workflows/raidExtractionWorkflow.js";
import { RequirementStatusWorkflow } from "../core/services/workflows/requirementStatusWorkflow.js";
import { WeeklyTimeReportWorkflow } from "../core/services/workflows/weeklyTimeReportWorkflow.js";
import { authContextMiddleware } from "../core/middleware/AuthContextMiddleware.js";
import { licenseValidationMiddleware } from "../core/middleware/LicenseValidationMiddleware.js";
import { requestLoggingMiddleware } from "../core/middleware/RequestLoggingMiddleware.js";
import { tenantResolutionMiddleware } from "../core/middleware/TenantResolutionMiddleware.js";
import { connectorTelemetryService, retryPolicyService } from "../observability/runtime.js";

const weeklyReportRequestSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().min(1),
  userPrompt: z.string().optional()
});
const agentExecuteRequestSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().min(1),
  message: z.string().min(1)
});
const raidExtractionRequestSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().optional(),
  notesText: z.string().min(1),
  sourceType: z.enum(["meeting_notes", "status_notes", "workshop_notes", "generic"]).optional(),
  metadata: z.record(z.unknown()).optional()
});
const changeAssessmentRequestSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().optional(),
  changeText: z.string().min(1),
  sourceType: z.enum(["client_request", "internal_request", "governance_request", "generic"]).optional(),
  requestedBy: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional()
});
const deliveryAdvisorRequestSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().optional(),
  message: z.string().optional(),
  contextType: z.enum(["delivery_advice", "risk_review", "priority_review"]).optional(),
  metadata: z.record(z.unknown()).optional()
});
const projectSummaryRequestSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().optional(),
  message: z.string().optional(),
  contextType: z.enum(["project_summary", "executive_summary", "status_summary"]).optional(),
  metadata: z.record(z.unknown()).optional()
});
const forecastRequestSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().optional(),
  forecastType: z.enum(["delivery", "capacity", "billing", "full"]).optional(),
  message: z.string().optional(),
  timeEntries: z
    .array(
      z.object({
        timeEntryId: z.string(),
        tenantId: z.string(),
        projectId: z.string(),
        taskId: z.string().optional(),
        userId: z.string().optional(),
        date: z.coerce.date(),
        hours: z.number(),
        billable: z.boolean(),
        description: z.string().optional()
      })
    )
    .optional(),
  metadata: z.record(z.unknown()).optional()
});
const timeEntryIngestSchema = z.object({
  tenantId: z.string().min(1),
  entries: z
    .array(
      z.object({
        timeEntryId: z.string().min(1),
        tenantId: z.string().min(1),
        projectId: z.string().min(1),
        taskId: z.string().nullable().optional(),
        sourceSystem: z.string().min(1),
        externalTimeEntryId: z.string().nullable().optional(),
        userId: z.string().nullable().optional(),
        userDisplayName: z.string().nullable().optional(),
        entryDate: z.coerce.date(),
        hours: z.number().min(0).max(24),
        minutes: z.number().int().min(0).max(59).nullable().optional(),
        billableStatus: z.enum(["billable", "non_billable", "unknown"]).optional(),
        billingCategory: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        tags: z.array(z.string()).optional()
      })
    )
    .min(1)
});
const timeQuerySchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
});
const weeklyTimeReportRequestSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
});
const monthlyBillingSummaryRequestSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2100).optional()
});
const createCourseRequestSchema = z.object({
  tenantId: z.string().min(1),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  roleTargets: z.array(z.string()).default([]),
  modules: z.array(
    z.object({
      id: z.string().min(1),
      courseId: z.string().min(1),
      title: z.string().min(1),
      lessons: z.array(
        z.object({
          id: z.string().min(1),
          moduleId: z.string().min(1),
          title: z.string().min(1),
          contentType: z.enum(["video", "markdown", "pdf", "external_reference"]),
          contentReference: z.string().min(1),
          estimatedDuration: z.number().int().positive()
        })
      )
    })
  ),
  publishedStatus: z.enum(["draft", "published"]).optional()
});
const policyRequestSchema = z.object({
  tenantId: z.string().min(1),
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  documentReference: z.string().min(1),
  tags: z.array(z.string()).default([]),
  applicableRoles: z.array(z.string()).default([])
});
const recommendationRequestSchema = z.object({
  tenantId: z.string().min(1),
  role: z.string().min(1),
  department: z.string().optional()
});
const progressTrackSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  courseId: z.string().min(1),
  moduleId: z.string().min(1),
  lessonId: z.string().min(1),
  completionStatus: z.enum(["not_started", "in_progress", "completed"])
});
const progressLookupSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  courseId: z.string().min(1)
});
const knowledgeSearchSchema = z.object({
  tenantId: z.string().min(1),
  query: z.string().min(1),
  role: z.string().optional()
});
const onboardingLookupSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().optional(),
  role: z.string().min(1),
  department: z.string().optional(),
  query: z.string().optional()
});

const documentSearchSchema = knowledgeSearchSchema.extend({
  documentId: z.string().optional(),
  libraryId: z.string().optional(),
  tags: z.array(z.string()).optional()
});
const complianceRequirementSchema = z.object({
  tenantId: z.string().min(1),
  id: z.string().min(1),
  requirementType: z.enum(["policy", "course"]),
  requirementId: z.string().min(1),
  appliesToRoles: z.array(z.string()).default([]),
  appliesToDepartments: z.array(z.string()).optional(),
  mandatory: z.boolean(),
  dueInDays: z.number().int().positive().nullable().optional(),
  refresherPeriodDays: z.number().int().positive().nullable().optional(),
  acknowledgementRequired: z.boolean(),
  signatureRequired: z.boolean()
});
const complianceStatusQuerySchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  role: z.string().default("Employee"),
  department: z.string().optional()
});
const acknowledgementSchema = z.object({
  tenantId: z.string().min(1),
  id: z.string().min(1),
  userId: z.string().min(1),
  subjectType: z.enum(["policy", "course", "lesson"]),
  subjectId: z.string().min(1),
  subjectVersionId: z.string().nullable().optional(),
  acknowledgementType: z.enum(["opened", "completed", "accepted", "signed", "hr_override"]),
  status: z.enum(["pending", "completed", "invalidated"]),
  actorId: z.string().nullable().optional(),
  actorRole: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  deviceInfo: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});
const hrOverrideSchema = z.object({
  tenantId: z.string().min(1),
  id: z.string().min(1),
  userId: z.string().min(1),
  subjectType: z.enum(["policy", "course", "lesson"]),
  subjectId: z.string().min(1),
  subjectVersionId: z.string().nullable().optional(),
  overriddenBy: z.string().min(1),
  reason: z.string().min(1)
});
const policyVersionSchema = z.object({
  tenantId: z.string().min(1),
  id: z.string().min(1),
  versionLabel: z.string().min(1),
  documentReference: z.string().min(1),
  effectiveDate: z.coerce.date(),
  changeSummary: z.string().nullable().optional()
});
const courseVersionSchema = z.object({
  tenantId: z.string().min(1),
  id: z.string().min(1),
  versionLabel: z.string().min(1),
  changeSummary: z.string().nullable().optional()
});

export const productRoutes = Router();
const resolveTenant = tenantResolutionMiddleware(tenantContextServiceV2);
const validateLicense = licenseValidationMiddleware(licenseServiceV2, planLimitServiceV2);
const raidWorkflow = new RaidExtractionWorkflow(new PromptEngine());
const changeWorkflow = new ChangeAssessmentWorkflow(new PromptEngine());
const deliveryWorkflow = new DeliveryAdvisorWorkflow(new PromptEngine());
const projectSummaryWorkflow = new ProjectSummaryWorkflow(new PromptEngine());
const forecastWorkflow = new ForecastWorkflow(forecastServiceV2, new PromptEngine());
const weeklyTimeWorkflow = new WeeklyTimeReportWorkflow(
  timeEntryServiceV2,
  resourceServiceV2,
  effortSummaryServiceV2,
  new PromptEngine()
);
const monthlyBillingWorkflow = new MonthlyBillingSummaryWorkflow(
  timeEntryServiceV2,
  resourceServiceV2,
  effortSummaryServiceV2,
  new PromptEngine()
);
const courseRecommendationWorkflow = new CourseRecommendationWorkflow(recommendationServiceV2);
const onboardingRecommendationWorkflow = new OnboardingRecommendationWorkflow(onboardingRecommendationServiceV2);
const nextTrainingStepWorkflow = new NextTrainingStepWorkflow(
  onboardingRecommendationServiceV2,
  onboardingProgressServiceV2
);
const roleKnowledgeLookupWorkflow = new RoleKnowledgeLookupWorkflow(
  onboardingRecommendationServiceV2,
  sharePointConnectorV2
);
const policyLookupWorkflow = new PolicyLookupWorkflow(policyServiceV2);
const learningProgressWorkflow = new LearningProgressWorkflow(courseServiceV2, learningProgressServiceV2);
const knowledgeExplainWorkflow = new KnowledgeExplainWorkflow(knowledgeIndexServiceV2, new PromptEngine());
const sharePointDocumentLookupWorkflow = new SharePointDocumentLookupWorkflow(
  sharePointConnectorV2,
  knowledgeIndexServiceV2
);
const knowledgeDocumentSummaryWorkflow = new KnowledgeDocumentSummaryWorkflow(
  sharePointConnectorV2,
  knowledgeIndexServiceV2,
  new PromptEngine()
);
const complianceAuditWorkflow = new ComplianceAuditWorkflow(
  complianceRequirementServiceV2,
  acknowledgementServiceV2,
  complianceTrackingServiceV2,
  complianceReportServiceV2,
  complianceConfigServiceV2
);
const requirementStatusWorkflow = new RequirementStatusWorkflow(
  complianceRequirementServiceV2,
  acknowledgementServiceV2,
  complianceTrackingServiceV2,
  complianceConfigServiceV2
);

productRoutes.use(authContextMiddleware);
productRoutes.use(requestLoggingMiddleware(usageLogServiceV2));

productRoutes.get("/tenants/:tenantId/context", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    req.requestMetadata = { requestType: "tenant_context_lookup" };
    const context = await tenantContextServiceV2.resolve(req.params.tenantId);
    res.json(context);
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/m365/graph/admin-consent", async (req, res, next) => {
  try {
    const tenantId = String(req.query.tenantId ?? "common");
    const state = String(req.query.state ?? `m365-${Date.now()}`);
    const url = graphAuthServiceV2.buildAdminConsentUrl(state, tenantId);
    res.json({ tenantId, state, url });
  } catch (error) {
    next(error);
  }
});
productRoutes.get("/projects/:projectId/context", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }
    const projectContext = await projectContextServiceV2.getProjectContext(
      tenantContext,
      req.params.projectId
    );
    req.requestMetadata = {
      requestType: "project_context_lookup",
      connectorUsed: projectContext.project.sourceSystem
    };
    res.json(projectContext);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/weekly-report", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = weeklyReportRequestSchema.parse(req.body);
    const response = await weeklyReportWorkflow.execute(parsed);
    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "weekly_report",
      connectorUsed: response.report.projectSummary
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/raid-extraction", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsedRequest = raidExtractionRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid RAID extraction request payload", 400, {
        issues: parsedRequest.error.issues
      });
    }
    const parsed = parsedRequest.data;
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const projectContext: NormalizedProjectContext = parsed.projectId
      ? await projectContextServiceV2.getProjectContext(tenantContext, parsed.projectId)
      : {
          project: {
            projectId: "notes-only",
            tenantId: tenantContext.tenant.tenantId,
            sourceSystem: "notes",
            name: "Notes Only Context",
            deliveryMode: "hybrid"
          },
          tasks: [],
          milestones: [],
          risks: [],
          issues: [],
          dependencies: [],
          statusSummary: "Amber"
        };

    const executionStart = Date.now();
    const response = await raidWorkflow.execute({
      tenantContext,
      projectContext,
      userRequest: parsed.notesText,
      workflowId: "raid_extraction",
      timestamp: new Date(),
      metadata: { sourceType: parsed.sourceType ?? "generic", ...(parsed.metadata ?? {}) }
    });

    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "raid_extraction",
      workflowId: "raid_extraction",
      confidenceScore: response.confidenceScore,
      warningsCount: Array.isArray((response.data as { warnings?: unknown[] }).warnings)
        ? (response.data as { warnings: unknown[] }).warnings.length
        : 0,
      connectorUsed: projectContext.project.sourceSystem,
      executionTimeMs: Date.now() - executionStart
    };

    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/change-assessment", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsedRequest = changeAssessmentRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid change assessment request payload", 400, {
        issues: parsedRequest.error.issues
      });
    }
    const parsed = parsedRequest.data;
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const projectContext: NormalizedProjectContext = parsed.projectId
      ? await projectContextServiceV2.getProjectContext(tenantContext, parsed.projectId)
      : {
          project: {
            projectId: "change-only",
            tenantId: tenantContext.tenant.tenantId,
            sourceSystem: "notes",
            name: "Change Request Context",
            deliveryMode: "hybrid"
          },
          tasks: [],
          milestones: [],
          risks: [],
          issues: [],
          dependencies: [],
          statusSummary: "Amber"
        };

    const executionStart = Date.now();
    const response = await changeWorkflow.execute({
      tenantContext,
      projectContext,
      userRequest: parsed.changeText,
      workflowId: "change_assessment",
      timestamp: new Date(),
      metadata: {
        sourceType: parsed.sourceType ?? "generic",
        requestedBy: parsed.requestedBy ?? null,
        ...(parsed.metadata ?? {})
      }
    });

    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "change_assessment",
      workflowId: "change_assessment",
      confidenceScore: response.confidenceScore,
      warningsCount: Array.isArray((response.data as { warnings?: unknown[] }).warnings)
        ? (response.data as { warnings: unknown[] }).warnings.length
        : 0,
      connectorUsed: projectContext.project.sourceSystem,
      executionTimeMs: Date.now() - executionStart
    };

    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/delivery-advisor", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsedRequest = deliveryAdvisorRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid delivery advisor request payload", 400, {
        issues: parsedRequest.error.issues
      });
    }
    const parsed = parsedRequest.data;
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const projectContext: NormalizedProjectContext = parsed.projectId
      ? await projectContextServiceV2.getProjectContext(tenantContext, parsed.projectId)
      : {
          project: {
            projectId: "delivery-only",
            tenantId: tenantContext.tenant.tenantId,
            sourceSystem: "notes",
            name: "Delivery Advisory Context",
            deliveryMode: "hybrid"
          },
          tasks: [],
          milestones: [],
          risks: [],
          issues: [],
          dependencies: [],
          statusSummary: "Amber"
        };

    const executionStart = Date.now();
    const response = await deliveryWorkflow.execute({
      tenantContext,
      projectContext,
      userRequest: parsed.message ?? "What should I focus on next?",
      workflowId: "delivery_advisor",
      timestamp: new Date(),
      metadata: {
        contextType: parsed.contextType ?? "delivery_advice",
        ...(parsed.metadata ?? {})
      }
    });

    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "delivery_advisor",
      workflowId: "delivery_advisor",
      confidenceScore: response.confidenceScore,
      warningsCount: Array.isArray((response.data as { warnings?: unknown[] }).warnings)
        ? (response.data as { warnings: unknown[] }).warnings.length
        : 0,
      connectorUsed: projectContext.project.sourceSystem,
      executionTimeMs: Date.now() - executionStart
    };

    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/project-summary", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsedRequest = projectSummaryRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid project summary request payload", 400, {
        issues: parsedRequest.error.issues
      });
    }
    const parsed = parsedRequest.data;
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const projectContext: NormalizedProjectContext = parsed.projectId
      ? await projectContextServiceV2.getProjectContext(tenantContext, parsed.projectId)
      : {
          project: {
            projectId: "summary-only",
            tenantId: tenantContext.tenant.tenantId,
            sourceSystem: "notes",
            name: "Project Summary Context",
            deliveryMode: "hybrid"
          },
          tasks: [],
          milestones: [],
          risks: [],
          issues: [],
          dependencies: [],
          statusSummary: "Amber"
        };

    const executionStart = Date.now();
    const response = await projectSummaryWorkflow.execute({
      tenantContext,
      projectContext,
      userRequest: parsed.message ?? "Summarize this project",
      workflowId: "project_summary",
      timestamp: new Date(),
      metadata: {
        contextType: parsed.contextType ?? "project_summary",
        ...(parsed.metadata ?? {})
      }
    });

    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "project_summary",
      workflowId: "project_summary",
      confidenceScore: response.confidenceScore,
      warningsCount: Array.isArray((response.data as { warnings?: unknown[] }).warnings)
        ? (response.data as { warnings: unknown[] }).warnings.length
        : 0,
      connectorUsed: projectContext.project.sourceSystem,
      executionTimeMs: Date.now() - executionStart
    };

    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/forecast", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsedRequest = forecastRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid forecast workflow request payload", 400, {
        issues: parsedRequest.error.issues
      });
    }
    const parsed = parsedRequest.data;
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const projectContext: NormalizedProjectContext = parsed.projectId
      ? await projectContextServiceV2.getProjectContext(tenantContext, parsed.projectId)
      : {
          project: {
            projectId: "forecast-only",
            tenantId: tenantContext.tenant.tenantId,
            sourceSystem: "notes",
            name: "Forecast Context",
            deliveryMode: "hybrid"
          },
          tasks: [],
          milestones: [],
          risks: [],
          issues: [],
          dependencies: [],
          statusSummary: "Amber"
        };

    const forecastType = parsed.forecastType ?? "full";
    const executionStart = Date.now();
    const response = await forecastWorkflow.execute({
      tenantContext,
      projectContext,
      userRequest: parsed.message ?? "Show forecast for this project",
      workflowId: "forecast",
      timestamp: new Date(),
      metadata: {
        forecastType,
        timeEntries: parsed.timeEntries ?? [],
        ...(parsed.metadata ?? {})
      }
    });

    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "forecast_engine",
      workflowId: "forecast",
      forecastType,
      confidenceScore: response.confidenceScore,
      warningsCount: Array.isArray((response.data as { warnings?: unknown[] }).warnings)
        ? (response.data as { warnings: unknown[] }).warnings.length
        : 0,
      connectorUsed: projectContext.project.sourceSystem,
      executionTimeMs: Date.now() - executionStart
    };

    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/weekly-time-report", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsedRequest = weeklyTimeReportRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid weekly time report request payload", 400, {
        issues: parsedRequest.error.issues
      });
    }
    const parsed = parsedRequest.data;
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }
    const projectContext: NormalizedProjectContext = parsed.projectId
      ? await projectContextServiceV2.getProjectContext(tenantContext, parsed.projectId)
      : {
          project: {
            projectId: "weekly-time",
            tenantId: tenantContext.tenant.tenantId,
            sourceSystem: "time",
            name: "Weekly Time Context",
            deliveryMode: "hybrid"
          },
          tasks: [],
          milestones: [],
          risks: [],
          issues: [],
          dependencies: [],
          statusSummary: "Amber"
        };

    const executionStart = Date.now();
    const response = await weeklyTimeWorkflow.execute({
      tenantContext,
      projectContext,
      userRequest: "Show weekly time report",
      workflowId: "weekly_time_report",
      timestamp: new Date(),
      metadata: {
        projectId: parsed.projectId,
        startDate: parsed.startDate,
        endDate: parsed.endDate
      }
    });

    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "weekly_time_report",
      workflowId: "weekly_time_report",
      confidenceScore: response.confidenceScore,
      executionTimeMs: Date.now() - executionStart
    };

    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/monthly-billing-summary", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsedRequest = monthlyBillingSummaryRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid monthly billing summary request payload", 400, {
        issues: parsedRequest.error.issues
      });
    }
    const parsed = parsedRequest.data;
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }
    const projectContext: NormalizedProjectContext = parsed.projectId
      ? await projectContextServiceV2.getProjectContext(tenantContext, parsed.projectId)
      : {
          project: {
            projectId: "monthly-billing",
            tenantId: tenantContext.tenant.tenantId,
            sourceSystem: "time",
            name: "Monthly Billing Context",
            deliveryMode: "hybrid"
          },
          tasks: [],
          milestones: [],
          risks: [],
          issues: [],
          dependencies: [],
          statusSummary: "Amber"
        };

    const executionStart = Date.now();
    const response = await monthlyBillingWorkflow.execute({
      tenantContext,
      projectContext,
      userRequest: "Show monthly billing summary",
      workflowId: "monthly_billing_summary",
      timestamp: new Date(),
      metadata: {
        projectId: parsed.projectId,
        month: parsed.month,
        year: parsed.year
      }
    });

    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "monthly_billing_summary",
      workflowId: "monthly_billing_summary",
      confidenceScore: response.confidenceScore,
      executionTimeMs: Date.now() - executionStart
    };

    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/course-recommendation", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = recommendationRequestSchema.parse(req.body);
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const response = await courseRecommendationWorkflow.execute({
      tenantContext,
      projectContext: {
        project: {
          projectId: "learning-domain",
          tenantId: tenantContext.tenant.tenantId,
          sourceSystem: "knowledge",
          name: "Learning Domain",
          deliveryMode: "hybrid"
        },
        tasks: [],
        milestones: [],
        risks: [],
        issues: [],
        dependencies: [],
        statusSummary: "Knowledge"
      },
      userRequest: `Recommend courses for ${parsed.role}`,
      workflowId: "course_recommendation",
      timestamp: new Date(),
      metadata: { role: parsed.role, department: parsed.department }
    });

    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "course_recommendation",
      workflowId: "course_recommendation"
    };
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/policy-lookup", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = knowledgeSearchSchema.extend({
      category: z.string().optional(),
      tag: z.string().optional()
    }).parse(req.body);
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const response = await policyLookupWorkflow.execute({
      tenantContext,
      projectContext: {
        project: {
          projectId: "policy-domain",
          tenantId: tenantContext.tenant.tenantId,
          sourceSystem: "knowledge",
          name: "Policy Domain",
          deliveryMode: "hybrid"
        },
        tasks: [],
        milestones: [],
        risks: [],
        issues: [],
        dependencies: [],
        statusSummary: "Knowledge"
      },
      userRequest: parsed.query,
      workflowId: "policy_lookup",
      timestamp: new Date(),
      metadata: { role: parsed.role, category: parsed.category, tag: parsed.tag }
    });

    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "policy_lookup",
      workflowId: "policy_lookup"
    };
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/learning-progress", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = progressLookupSchema.parse(req.body);
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const response = await learningProgressWorkflow.execute({
      tenantContext,
      projectContext: {
        project: {
          projectId: "progress-domain",
          tenantId: tenantContext.tenant.tenantId,
          sourceSystem: "knowledge",
          name: "Learning Progress Domain",
          deliveryMode: "hybrid"
        },
        tasks: [],
        milestones: [],
        risks: [],
        issues: [],
        dependencies: [],
        statusSummary: "Knowledge"
      },
      userRequest: `Show progress for ${parsed.courseId}`,
      workflowId: "learning_progress",
      timestamp: new Date(),
      metadata: { userId: parsed.userId, courseId: parsed.courseId }
    });

    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "learning_progress",
      workflowId: "learning_progress"
    };
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/knowledge-explain", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = knowledgeSearchSchema.parse(req.body);
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const response = await knowledgeExplainWorkflow.execute({
      tenantContext,
      projectContext: {
        project: {
          projectId: "knowledge-domain",
          tenantId: tenantContext.tenant.tenantId,
          sourceSystem: "knowledge",
          name: "Knowledge Domain",
          deliveryMode: "hybrid"
        },
        tasks: [],
        milestones: [],
        risks: [],
        issues: [],
        dependencies: [],
        statusSummary: "Knowledge"
      },
      userRequest: parsed.query,
      workflowId: "knowledge_explain",
      timestamp: new Date(),
      metadata: { role: parsed.role }
    });

    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "knowledge_explain",
      workflowId: "knowledge_explain"
    };
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/sharepoint-document-lookup", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = documentSearchSchema.parse(req.body);
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const response = await sharePointDocumentLookupWorkflow.execute({
      tenantContext,
      projectContext: {
        project: {
          projectId: "sharepoint-knowledge-domain",
          tenantId: tenantContext.tenant.tenantId,
          sourceSystem: "sharepoint",
          name: "SharePoint Knowledge Domain",
          deliveryMode: "hybrid"
        },
        tasks: [],
        milestones: [],
        risks: [],
        issues: [],
        dependencies: [],
        statusSummary: "Knowledge"
      },
      userRequest: parsed.query,
      workflowId: "sharepoint_document_lookup",
      timestamp: new Date(),
      metadata: { role: parsed.role, libraryId: parsed.libraryId, tags: parsed.tags }
    });

    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "sharepoint_document_lookup",
      workflowId: "sharepoint_document_lookup",
      connectorUsed: "sharepoint"
    };
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/knowledge-document-summary", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = documentSearchSchema.parse(req.body);
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const response = await knowledgeDocumentSummaryWorkflow.execute({
      tenantContext,
      projectContext: {
        project: {
          projectId: "sharepoint-summary-domain",
          tenantId: tenantContext.tenant.tenantId,
          sourceSystem: "sharepoint",
          name: "SharePoint Summary Domain",
          deliveryMode: "hybrid"
        },
        tasks: [],
        milestones: [],
        risks: [],
        issues: [],
        dependencies: [],
        statusSummary: "Knowledge"
      },
      userRequest: parsed.query,
      workflowId: "knowledge_document_summary",
      timestamp: new Date(),
      metadata: { role: parsed.role, documentId: parsed.documentId }
    });

    req.requestMetadata = {
      requestType: "workflow_execute",
      workflowType: "knowledge_document_summary",
      workflowId: "knowledge_document_summary",
      connectorUsed: "sharepoint"
    };
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});
productRoutes.post("/workflows/onboarding-recommendation", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = onboardingLookupSchema.parse(req.body);
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const response = await onboardingRecommendationWorkflow.execute({
      tenantContext,
      projectContext: {
        project: {
          projectId: "onboarding-domain",
          tenantId: tenantContext.tenant.tenantId,
          sourceSystem: "knowledge",
          name: "Onboarding Domain",
          deliveryMode: "hybrid"
        },
        tasks: [], milestones: [], risks: [], issues: [], dependencies: [], statusSummary: "Knowledge"
      },
      userRequest: parsed.query ?? parsed.role,
      workflowId: "onboarding_recommendation",
      timestamp: new Date(),
      metadata: { role: parsed.role, department: parsed.department }
    });

    req.requestMetadata = { requestType: "workflow_execute", workflowType: "onboarding_recommendation", workflowId: "onboarding_recommendation" };
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/next-training-step", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = onboardingLookupSchema.extend({ userId: z.string().min(1) }).parse(req.body);
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const response = await nextTrainingStepWorkflow.execute({
      tenantContext,
      projectContext: {
        project: {
          projectId: "onboarding-progress-domain",
          tenantId: tenantContext.tenant.tenantId,
          sourceSystem: "knowledge",
          name: "Onboarding Progress Domain",
          deliveryMode: "hybrid"
        },
        tasks: [], milestones: [], risks: [], issues: [], dependencies: [], statusSummary: "Knowledge"
      },
      userRequest: parsed.query ?? "What should I complete next?",
      workflowId: "next_training_step",
      timestamp: new Date(),
      metadata: { userId: parsed.userId, role: parsed.role, department: parsed.department }
    });

    req.requestMetadata = { requestType: "workflow_execute", workflowType: "next_training_step", workflowId: "next_training_step" };
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/workflows/role-knowledge-lookup", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = onboardingLookupSchema.parse(req.body);
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }

    const response = await roleKnowledgeLookupWorkflow.execute({
      tenantContext,
      projectContext: {
        project: {
          projectId: "role-knowledge-domain",
          tenantId: tenantContext.tenant.tenantId,
          sourceSystem: "knowledge",
          name: "Role Knowledge Domain",
          deliveryMode: "hybrid"
        },
        tasks: [], milestones: [], risks: [], issues: [], dependencies: [], statusSummary: "Knowledge"
      },
      userRequest: parsed.query ?? parsed.role,
      workflowId: "role_knowledge_lookup",
      timestamp: new Date(),
      metadata: { role: parsed.role, department: parsed.department }
    });

    req.requestMetadata = { requestType: "workflow_execute", workflowType: "role_knowledge_lookup", workflowId: "role_knowledge_lookup" };
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/onboarding/path", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = onboardingLookupSchema.parse({
      tenantId: String(req.query.tenantId ?? ""),
      userId: req.query.userId ? String(req.query.userId) : undefined,
      role: String(req.query.role ?? ""),
      department: req.query.department ? String(req.query.department) : undefined,
      query: req.query.query ? String(req.query.query) : undefined
    });
    const recommendation = onboardingRecommendationServiceV2.recommend(parsed.tenantId, parsed.role, parsed.department);
    req.requestMetadata = { requestType: "onboarding_path_get", workflowType: "knowledge_domain" };
    res.json(recommendation);
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/onboarding/progress", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = onboardingLookupSchema.extend({ userId: z.string().min(1) }).parse({
      tenantId: String(req.query.tenantId ?? ""),
      userId: String(req.query.userId ?? ""),
      role: String(req.query.role ?? ""),
      department: req.query.department ? String(req.query.department) : undefined,
      query: req.query.query ? String(req.query.query) : undefined
    });
    const recommendation = onboardingRecommendationServiceV2.recommend(parsed.tenantId, parsed.role, parsed.department);
    const progress = recommendation.onboardingPath
      ? onboardingProgressServiceV2.calculateProgress(parsed.tenantId, parsed.userId, recommendation.onboardingPath.id)
      : null;
    const nextStep = recommendation.onboardingPath
      ? onboardingProgressServiceV2.recommendNext(parsed.tenantId, parsed.userId, recommendation.onboardingPath.id)
      : null;
    req.requestMetadata = { requestType: "onboarding_progress_get", workflowType: "knowledge_domain" };
    res.json({ recommendation, progress, nextStep });
  } catch (error) {
    next(error);
  }
});
productRoutes.post("/agent/execute", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = agentExecuteRequestSchema.parse(req.body);
    const executionStart = Date.now();
    const response = await agentOrchestratorV2.execute(parsed);
    req.requestMetadata = {
      requestType: "agent_execute",
      workflowType: response.workflowId,
      workflowId: response.workflowId,
      confidenceScore: response.confidenceScore,
      connectorUsed: response.connectorUsed,
      executionTimeMs: Date.now() - executionStart
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/knowledge/documents", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = documentSearchSchema.parse({
      tenantId: String(req.query.tenantId ?? ""),
      query: String(req.query.query ?? "document"),
      role: req.query.role ? String(req.query.role) : undefined,
      libraryId: req.query.libraryId ? String(req.query.libraryId) : undefined,
      tags: typeof req.query.tags === "string" ? req.query.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : undefined
    });
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }
    const documents = await sharePointConnectorV2.listDocuments(tenantContext, {
      query: parsed.query === "document" ? undefined : parsed.query,
      role: parsed.role,
      libraryId: parsed.libraryId,
      tags: parsed.tags
    });
    knowledgeIndexServiceV2.indexDocuments(documents);
    req.requestMetadata = { requestType: "knowledge_documents_list", connectorUsed: "sharepoint" };
    res.json({ tenantId: tenantContext.tenant.tenantId, documents });
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/knowledge/documents/:documentId", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }
    const document = await sharePointConnectorV2.getDocument(tenantContext, req.params.documentId);
    if (!document) {
      throw new AppError("PROJECT_NOT_FOUND", `Document ${req.params.documentId} not found`, 404);
    }
    knowledgeIndexServiceV2.indexDocuments([document]);
    req.requestMetadata = { requestType: "knowledge_document_get", connectorUsed: "sharepoint" };
    res.json(document);
  } catch (error) {
    next(error);
  }
});
productRoutes.post("/learning/courses", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = createCourseRequestSchema.parse(req.body);
    const course = courseServiceV2.createCourse(parsed);
    knowledgeIndexServiceV2.indexCourses([course]);
    req.requestMetadata = { requestType: "learning_course_create", workflowType: "knowledge_domain" };
    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/learning/courses", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const tenantId = String(req.query.tenantId ?? "");
    const publishedOnly = String(req.query.publishedOnly ?? "true") !== "false";
    const courses = courseServiceV2.getCourseCatalog(tenantId, publishedOnly);
    req.requestMetadata = { requestType: "learning_courses_list", workflowType: "knowledge_domain" };
    res.json({ tenantId, courses });
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/learning/courses/:courseId", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const tenantId = String(req.query.tenantId ?? req.params.tenantId ?? req.body?.tenantId ?? "");
    const course = courseServiceV2.getCourseById(tenantId, req.params.courseId);
    req.requestMetadata = { requestType: "learning_course_get", workflowType: "knowledge_domain" };
    res.json(course);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/learning/courses/:courseId/publish", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const tenantId = String(req.body?.tenantId ?? "");
    const course = courseServiceV2.publishCourse(tenantId, req.params.courseId);
    req.requestMetadata = { requestType: "learning_course_publish", workflowType: "knowledge_domain" };
    res.json(course);
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/learning/lessons/:lessonId", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const tenantId = String(req.query.tenantId ?? "");
    const lesson = lessonServiceV2.getLesson(tenantId, req.params.lessonId);
    req.requestMetadata = { requestType: "learning_lesson_get", workflowType: "knowledge_domain" };
    res.json(lesson);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/learning/progress", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = progressTrackSchema.parse(req.body);
    const progress = lessonServiceV2.trackLessonProgress({
      userId: parsed.userId,
      courseId: parsed.courseId,
      moduleId: parsed.moduleId,
      lessonId: parsed.lessonId,
      completionStatus: parsed.completionStatus
    });
    req.requestMetadata = { requestType: "learning_progress_track", workflowType: "knowledge_domain" };
    res.status(201).json(progress);
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/learning/progress", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = progressLookupSchema.parse(req.query);
    const course = courseServiceV2.getCourseById(parsed.tenantId, parsed.courseId);
    const progress = learningProgressServiceV2.calculateCourseProgress(parsed.userId, course);
    req.requestMetadata = { requestType: "learning_progress_get", workflowType: "knowledge_domain" };
    res.json({ userId: parsed.userId, courseId: parsed.courseId, ...progress });
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/learning/policies", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = policyRequestSchema.parse(req.body);
    const policy = policyServiceV2.createPolicy(parsed);
    knowledgeIndexServiceV2.indexPolicies([policy]);
    req.requestMetadata = { requestType: "learning_policy_create", workflowType: "knowledge_domain" };
    res.status(201).json(policy);
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/learning/policies", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const tenantId = String(req.query.tenantId ?? "");
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const query = typeof req.query.query === "string" ? req.query.query : undefined;
    const policies = policyServiceV2.lookupPolicies(tenantId, { category, tag, role, query });
    req.requestMetadata = { requestType: "learning_policy_list", workflowType: "knowledge_domain" };
    res.json({ tenantId, policies });
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/learning/recommendations", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = recommendationRequestSchema.parse(req.query);
    const recommendations = recommendationServiceV2.recommendForRole(
      parsed.tenantId,
      parsed.role,
      parsed.department
    );
    req.requestMetadata = { requestType: "learning_recommendations_get", workflowType: "knowledge_domain" };
    res.json({ tenantId: parsed.tenantId, role: parsed.role, ...recommendations });
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/learning/knowledge/search", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = knowledgeSearchSchema.parse(req.query);
    const matches = knowledgeIndexServiceV2.search(parsed.tenantId, parsed.query, parsed.role);
    req.requestMetadata = { requestType: "learning_knowledge_search", workflowType: "knowledge_domain" };
    res.json({ tenantId: parsed.tenantId, query: parsed.query, matches });
  } catch (error) {
    next(error);
  }
});

productRoutes.post(
  "/compliance/requirements",
  resolveTenant,
  validateLicense,
  requireAdminAuth,
  requireAdminRole(["superadmin", "supportadmin"]),
  async (req, res, next) => {
    try {
      const requirement = complianceRequirementSchema.parse(req.body);
      const created = complianceRequirementServiceV2.createRequirement(requirement);
      adminAuditService.record(req.adminUser!, "compliance.requirement.create", requirement.tenantId, {
        requirementId: requirement.id,
        requirementType: requirement.requirementType
      });
      req.requestMetadata = { requestType: "compliance_requirement_create", workflowType: "compliance" };
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }
);

productRoutes.get(
  "/compliance/requirements",
  resolveTenant,
  validateLicense,
  requireAdminAuth,
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  async (req, res, next) => {
    try {
      const tenantId = String(req.query.tenantId ?? "");
      req.requestMetadata = { requestType: "compliance_requirement_list", workflowType: "compliance" };
      res.json({ tenantId, requirements: complianceRequirementServiceV2.listRequirements(tenantId) });
    } catch (error) {
      next(error);
    }
  }
);

productRoutes.get("/compliance/status", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = complianceStatusQuerySchema.parse(req.query);
    const statuses = complianceTrackingServiceV2.calculateStatuses({
      tenantId: parsed.tenantId,
      userId: parsed.userId,
      requirements: complianceRequirementServiceV2.resolveApplicableRequirements(
        parsed.tenantId,
        parsed.role,
        parsed.department
      ),
      acknowledgements: acknowledgementServiceV2.findHistory({
        tenantId: parsed.tenantId,
        userId: parsed.userId
      }),
      config: complianceConfigServiceV2.getConfig(parsed.tenantId)
    });
    req.requestMetadata = { requestType: "compliance_status_get", workflowType: "compliance" };
    res.json({ tenantId: parsed.tenantId, userId: parsed.userId, statuses });
  } catch (error) {
    next(error);
  }
});

productRoutes.get(
  "/compliance/reports/tenant-summary",
  resolveTenant,
  validateLicense,
  requireAdminAuth,
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  async (req, res, next) => {
    try {
      const parsed = complianceStatusQuerySchema.parse({
        tenantId: req.query.tenantId,
        userId: req.query.userId ?? "tenant-scope",
        role: req.query.role ?? "Employee",
        department: req.query.department
      });
      const statuses = complianceTrackingServiceV2.calculateStatuses({
        tenantId: parsed.tenantId,
        userId: parsed.userId,
        requirements: complianceRequirementServiceV2.resolveApplicableRequirements(
          parsed.tenantId,
          parsed.role,
          parsed.department
        ),
        acknowledgements: acknowledgementServiceV2.findHistory({
          tenantId: parsed.tenantId,
          userId: parsed.userId
        }),
        config: complianceConfigServiceV2.getConfig(parsed.tenantId)
      });
      req.requestMetadata = { requestType: "compliance_report_tenant_summary", workflowType: "compliance" };
      res.json(complianceReportServiceV2.tenantSummary(parsed.tenantId, statuses));
    } catch (error) {
      next(error);
    }
  }
);

productRoutes.get(
  "/compliance/reports/user-summary",
  resolveTenant,
  validateLicense,
  requireAdminAuth,
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  async (req, res, next) => {
    try {
      const parsed = complianceStatusQuerySchema.parse(req.query);
      const statuses = complianceTrackingServiceV2.calculateStatuses({
        tenantId: parsed.tenantId,
        userId: parsed.userId,
        requirements: complianceRequirementServiceV2.resolveApplicableRequirements(
          parsed.tenantId,
          parsed.role,
          parsed.department
        ),
        acknowledgements: acknowledgementServiceV2.findHistory({
          tenantId: parsed.tenantId,
          userId: parsed.userId
        }),
        config: complianceConfigServiceV2.getConfig(parsed.tenantId)
      });
      req.requestMetadata = { requestType: "compliance_report_user_summary", workflowType: "compliance" };
      res.json(complianceReportServiceV2.userSummary(parsed.tenantId, parsed.userId, statuses));
    } catch (error) {
      next(error);
    }
  }
);

productRoutes.post("/compliance/acknowledgements", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = acknowledgementSchema.parse(req.body);
    const signatureRequired = complianceRequirementServiceV2
      .listRequirements(parsed.tenantId)
      .some((requirement) => requirement.requirementId === parsed.subjectId && requirement.signatureRequired);
    const acknowledgement = acknowledgementServiceV2.recordAcknowledgement(
      {
        ...parsed,
        subjectVersionId: parsed.subjectVersionId ?? null,
        actorId: parsed.actorId ?? null,
        actorRole: parsed.actorRole ?? null,
        ipAddress: parsed.ipAddress ?? null,
        deviceInfo: parsed.deviceInfo ?? null,
        notes: parsed.notes ?? null,
        recordedAt: new Date()
      },
      complianceConfigServiceV2.getConfig(parsed.tenantId),
      signatureRequired
    );
    req.requestMetadata = { requestType: "compliance_acknowledgement_create", workflowType: "compliance" };
    res.status(201).json(acknowledgement);
  } catch (error) {
    next(error);
  }
});

productRoutes.get(
  "/compliance/acknowledgements",
  resolveTenant,
  validateLicense,
  requireAdminAuth,
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  async (req, res, next) => {
    try {
      const tenantId = String(req.query.tenantId ?? "");
      const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
      const subjectType = typeof req.query.subjectType === "string" ? (req.query.subjectType as any) : undefined;
      const subjectId = typeof req.query.subjectId === "string" ? req.query.subjectId : undefined;
      req.requestMetadata = { requestType: "compliance_acknowledgement_list", workflowType: "compliance" };
      res.json({
        tenantId,
        acknowledgements: acknowledgementServiceV2.findHistory({ tenantId, userId, subjectType, subjectId })
      });
    } catch (error) {
      next(error);
    }
  }
);

productRoutes.get("/compliance/my-acknowledgements", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const tenantId = String(req.query.tenantId ?? "");
    const userId = String(req.query.userId ?? req.userContext?.userId ?? "");
    req.requestMetadata = { requestType: "compliance_my_acknowledgement_list", workflowType: "compliance" };
    res.json({
      tenantId,
      userId,
      acknowledgements: acknowledgementServiceV2.findHistory({ tenantId, userId })
    });
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/compliance/config", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const tenantId = String(req.query.tenantId ?? "");
    req.requestMetadata = { requestType: "compliance_config_get", workflowType: "compliance" };
    res.json({ tenantId, config: complianceConfigServiceV2.getConfig(tenantId) });
  } catch (error) {
    next(error);
  }
});

productRoutes.post(
  "/compliance/hr-overrides",
  resolveTenant,
  validateLicense,
  requireAdminAuth,
  requireAdminRole(["superadmin", "supportadmin"]),
  async (req, res, next) => {
    try {
      const parsed = hrOverrideSchema.parse(req.body);
      const created = hrOverrideServiceV2.createOverride(
        {
          ...parsed,
          subjectVersionId: parsed.subjectVersionId ?? null,
          recordedAt: new Date()
        },
        complianceConfigServiceV2.getConfig(parsed.tenantId)
      );
      acknowledgementServiceV2.recordAcknowledgement(
        created.acknowledgement,
        complianceConfigServiceV2.getConfig(parsed.tenantId),
        false
      );
      adminAuditService.record(req.adminUser!, "compliance.hr_override.create", parsed.tenantId, {
        userId: parsed.userId,
        subjectType: parsed.subjectType,
        subjectId: parsed.subjectId
      });
      req.requestMetadata = { requestType: "compliance_hr_override_create", workflowType: "compliance" };
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }
);

productRoutes.get(
  "/compliance/hr-overrides",
  resolveTenant,
  validateLicense,
  requireAdminAuth,
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  async (req, res, next) => {
    try {
      const tenantId = String(req.query.tenantId ?? "");
      req.requestMetadata = { requestType: "compliance_hr_override_list", workflowType: "compliance" };
      res.json({ tenantId, overrides: hrOverrideServiceV2.listOverrides(tenantId) });
    } catch (error) {
      next(error);
    }
  }
);

productRoutes.post(
  "/policies/:policyId/versions",
  resolveTenant,
  validateLicense,
  requireAdminAuth,
  requireAdminRole(["superadmin", "supportadmin"]),
  async (req, res, next) => {
    try {
      const parsed = policyVersionSchema.parse(req.body);
      const created = policyVersionServiceV2.createVersion({
        ...parsed,
        policyId: req.params.policyId,
        publishedAt: new Date(),
        publishedBy: req.adminUser?.email ?? null,
        isCurrent: true
      });
      acknowledgementServiceV2.replaceAcknowledgementsForTenant(
        parsed.tenantId,
        policyVersionServiceV2.invalidateAcknowledgementsForPolicy(
          req.params.policyId,
          acknowledgementServiceV2.listByTenant(parsed.tenantId)
        )
      );
      adminAuditService.record(req.adminUser!, "policy.version.publish", parsed.tenantId, {
        policyId: req.params.policyId,
        versionId: parsed.id
      });
      req.requestMetadata = { requestType: "policy_version_create", workflowType: "compliance" };
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }
);

productRoutes.get(
  "/policies/:policyId/versions",
  resolveTenant,
  validateLicense,
  async (req, res, next) => {
    try {
      req.requestMetadata = { requestType: "policy_version_list", workflowType: "compliance" };
      res.json({ versions: policyVersionServiceV2.listVersionHistory(req.params.policyId) });
    } catch (error) {
      next(error);
    }
  }
);

productRoutes.post(
  "/courses/:courseId/versions",
  resolveTenant,
  validateLicense,
  requireAdminAuth,
  requireAdminRole(["superadmin", "supportadmin"]),
  async (req, res, next) => {
    try {
      const parsed = courseVersionSchema.parse(req.body);
      const created = courseVersionServiceV2.createVersion({
        ...parsed,
        courseId: req.params.courseId,
        tenantId: parsed.tenantId,
        publishedAt: new Date(),
        publishedBy: req.adminUser?.email ?? null,
        isCurrent: true
      });
      adminAuditService.record(req.adminUser!, "course.version.publish", parsed.tenantId, {
        courseId: req.params.courseId,
        versionId: parsed.id
      });
      req.requestMetadata = { requestType: "course_version_create", workflowType: "compliance" };
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }
);

productRoutes.get(
  "/courses/:courseId/versions",
  resolveTenant,
  validateLicense,
  async (req, res, next) => {
    try {
      req.requestMetadata = { requestType: "course_version_list", workflowType: "compliance" };
      res.json({ versions: courseVersionServiceV2.listVersionHistory(req.params.courseId) });
    } catch (error) {
      next(error);
    }
  }
);

productRoutes.get("/workflows/compliance-audit", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = complianceStatusQuerySchema.parse(req.query);
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }
    const response = await complianceAuditWorkflow.execute({
      tenantContext,
      projectContext: {
        project: {
          projectId: "compliance-domain",
          tenantId: parsed.tenantId,
          sourceSystem: "compliance",
          name: "Compliance Domain",
          deliveryMode: "hybrid"
        },
        tasks: [],
        milestones: [],
        risks: [],
        issues: [],
        dependencies: [],
        statusSummary: "Compliance"
      },
      userRequest: "Compliance audit",
      workflowId: "compliance_audit",
      timestamp: new Date(),
      metadata: { userId: parsed.userId, role: parsed.role, department: parsed.department }
    });
    req.requestMetadata = { requestType: "workflow_execute", workflowType: "compliance_audit" };
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/workflows/requirement-status", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsed = complianceStatusQuerySchema.parse(req.query);
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }
    const response = await requirementStatusWorkflow.execute({
      tenantContext,
      projectContext: {
        project: {
          projectId: "compliance-domain",
          tenantId: parsed.tenantId,
          sourceSystem: "compliance",
          name: "Compliance Domain",
          deliveryMode: "hybrid"
        },
        tasks: [],
        milestones: [],
        risks: [],
        issues: [],
        dependencies: [],
        statusSummary: "Compliance"
      },
      userRequest: "Requirement status",
      workflowId: "requirement_status",
      timestamp: new Date(),
      metadata: { userId: parsed.userId, role: parsed.role, department: parsed.department }
    });
    req.requestMetadata = { requestType: "workflow_execute", workflowType: "requirement_status" };
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/time-entries", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsedRequest = timeEntryIngestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid time entry ingest payload", 400, {
        issues: parsedRequest.error.issues
      });
    }
    const parsed = parsedRequest.data;
    const tenantContext = req.tenantContext;
    if (!tenantContext || parsed.tenantId !== tenantContext.tenant.tenantId) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context mismatch for time entry ingest", 400);
    }

    const entries = await timeEntryServiceV2.ingest(parsed.entries);
    req.requestMetadata = {
      requestType: "time_entries_ingest",
      workflowType: "time_intelligence",
      workflowId: "time_entries"
    };
    res.status(201).json({ tenantId: parsed.tenantId, count: entries.length, entries });
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/time-entries", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsedRequest = timeQuerySchema.safeParse(req.query);
    if (!parsedRequest.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid time entries query", 400, {
        issues: parsedRequest.error.issues
      });
    }
    const parsed = parsedRequest.data;
    const entries = await timeEntryServiceV2.query({
      tenantId: parsed.tenantId,
      projectId: parsed.projectId,
      userId: parsed.userId,
      startDate: parsed.startDate,
      endDate: parsed.endDate
    });
    req.requestMetadata = {
      requestType: "time_entries_query",
      workflowType: "time_intelligence",
      workflowId: "time_entries"
    };
    res.json({ tenantId: parsed.tenantId, count: entries.length, entries });
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/time/summary", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsedRequest = timeQuerySchema.safeParse(req.query);
    if (!parsedRequest.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid time summary query", 400, {
        issues: parsedRequest.error.issues
      });
    }
    const parsed = parsedRequest.data;
    const now = new Date();
    const periodStart = parsed.startDate ?? effortSummaryServiceV2.getWeeklyRange(now).startDate;
    const periodEnd = parsed.endDate ?? effortSummaryServiceV2.getWeeklyRange(now).endDate;

    const entries = await timeEntryServiceV2.query({
      tenantId: parsed.tenantId,
      projectId: parsed.projectId,
      userId: parsed.userId,
      startDate: periodStart,
      endDate: periodEnd
    });
    const resources = await resourceServiceV2.listByTenant(parsed.tenantId);
    const result = effortSummaryServiceV2.summarize(
      {
        tenantId: parsed.tenantId,
        projectId: parsed.projectId,
        userId: parsed.userId,
        startDate: periodStart,
        endDate: periodEnd
      },
      entries,
      resources
    );

    req.requestMetadata = {
      requestType: "time_summary_query",
      workflowType: "time_intelligence",
      workflowId: "time_summary"
    };
    res.json(result);
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/time/resource-summary", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const parsedRequest = timeQuerySchema.safeParse(req.query);
    if (!parsedRequest.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid time resource summary query", 400, {
        issues: parsedRequest.error.issues
      });
    }
    const parsed = parsedRequest.data;
    const now = new Date();
    const periodStart = parsed.startDate ?? effortSummaryServiceV2.getWeeklyRange(now).startDate;
    const periodEnd = parsed.endDate ?? effortSummaryServiceV2.getWeeklyRange(now).endDate;
    const entries: TimeEntry[] = await timeEntryServiceV2.query({
      tenantId: parsed.tenantId,
      projectId: parsed.projectId,
      userId: parsed.userId,
      startDate: periodStart,
      endDate: periodEnd
    });
    const resources = await resourceServiceV2.listByTenant(parsed.tenantId);
    const result = effortSummaryServiceV2.summarize(
      {
        tenantId: parsed.tenantId,
        projectId: parsed.projectId,
        userId: parsed.userId,
        startDate: periodStart,
        endDate: periodEnd
      },
      entries,
      resources
    );

    req.requestMetadata = {
      requestType: "time_resource_summary_query",
      workflowType: "time_intelligence",
      workflowId: "time_resource_summary"
    };
    res.json({
      tenantId: parsed.tenantId,
      projectId: parsed.projectId ?? null,
      periodStart,
      periodEnd,
      resourceSummary: result.resourceSummary
    });
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/licenses/:tenantId/validate", async (req, res, next) => {
  try {
    req.requestMetadata = { requestType: "license_validate" };
    const result = await licenseServiceV2.validateTenantLicenseStatus(req.params.tenantId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/connectors/clickup/health", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }
    const executionStart = Date.now();
    const result = await clickUpConnectorV2.healthCheck(tenantContext);
    connectorTelemetryService.record({
      requestId: req.requestId ?? "unknown-request",
      tenantId: tenantContext.tenant.tenantId,
      connectorName: "clickup",
      operation: "health_check",
      status:
        result.status === "unhealthy" ? "unhealthy" : result.status === "degraded" ? "degraded" : "healthy",
      responseTimeMs: Date.now() - executionStart,
      reason: result.message
    });
    req.requestMetadata = {
      requestType: "connector_clickup_health",
      workflowType: "connector_health_check",
      workflowId: "clickup_health",
      connectorUsed: "clickup",
      executionTimeMs: Date.now() - executionStart
    };
    res.json(result);
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/connectors/:tenantId/health", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const tenantContext = await tenantContextServiceV2.resolve(req.params.tenantId);
    const start = Date.now();
    const health = await retryPolicyService.execute(
      "connector.aggregate_health",
      () => projectContextServiceV2.healthForTenant(tenantContext),
      { maxAttempts: 2, baseDelayMs: 100 }
    );
    for (const connector of health) {
      connectorTelemetryService.record({
        requestId: req.requestId ?? "unknown-request",
        tenantId: req.params.tenantId,
        connectorName: connector.connector,
        operation: "aggregate_health",
        status: connector.healthy ? "healthy" : "degraded",
        responseTimeMs: Date.now() - start,
        reason: connector.healthy ? undefined : "Connector health check returned unhealthy"
      });
    }
    req.requestMetadata = { requestType: "connector_health_check" };
    res.json({ tenantId: req.params.tenantId, connectors: health });
  } catch (error) {
    next(error);
  }
});

productRoutes.post("/connectors/clickup/test-sync", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant context missing", 400);
    }
    const projectId = typeof req.body?.projectId === "string" ? req.body.projectId : undefined;
    const config = await connectorConfigServiceV2.getConnectorConfig(
      tenantContext.tenant.tenantId,
      "clickup"
    );
    const effectiveProjectId = projectId ?? config.listId;
    if (!effectiveProjectId) {
      throw new AppError(
        "CONNECTOR_CONFIG_NOT_FOUND",
        "Missing ClickUp project/list identifier for test sync",
        400
      );
    }

    const executionStart = Date.now();
    const [project, tasks, milestones, status, timeEntries] = await retryPolicyService.execute(
      "connector.clickup.test_sync",
      () =>
        Promise.all([
          clickUpConnectorV2.getProject(tenantContext, effectiveProjectId),
          clickUpConnectorV2.getTasks(tenantContext, effectiveProjectId),
          clickUpConnectorV2.getMilestones(tenantContext, effectiveProjectId),
          clickUpConnectorV2.getStatus(tenantContext, effectiveProjectId),
          clickUpConnectorV2.getTimeEntries(tenantContext, effectiveProjectId)
        ]),
      { maxAttempts: 2, baseDelayMs: 200 }
    );

    connectorTelemetryService.record({
      requestId: req.requestId ?? "unknown-request",
      tenantId: tenantContext.tenant.tenantId,
      connectorName: "clickup",
      operation: "test_sync",
      status: "healthy",
      responseTimeMs: Date.now() - executionStart
    });

    req.requestMetadata = {
      requestType: "connector_clickup_test_sync",
      workflowType: "connector_sync",
      workflowId: "clickup_test_sync",
      connectorUsed: "clickup",
      executionTimeMs: Date.now() - executionStart
    };

    res.json({
      tenantId: tenantContext.tenant.tenantId,
      connector: "clickup",
      projectId: effectiveProjectId,
      project,
      tasks,
      milestones,
      status,
      timeEntriesCount: timeEntries.length
    });
  } catch (error) {
    next(error);
  }
});













