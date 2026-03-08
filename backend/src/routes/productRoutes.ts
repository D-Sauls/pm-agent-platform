import { PromptEngine } from "../prompt/PromptEngine.js";
import { Router } from "express";
import { z } from "zod";
import {
  agentOrchestratorV2,
  clickUpConnectorV2,
  connectorConfigServiceV2,
  effortSummaryServiceV2,
  forecastServiceV2,
  licenseServiceV2,
  projectContextServiceV2,
  resourceServiceV2,
  tenantContextServiceV2,
  timeEntryServiceV2,
  usageLogServiceV2,
  weeklyReportWorkflow
} from "../core/container.js";
import { AppError } from "../core/errors/AppError.js";
import type { NormalizedProjectContext } from "../core/models/projectModels.js";
import type { TimeEntry } from "../core/models/timeModels.js";
import { ChangeAssessmentWorkflow } from "../core/services/workflows/changeAssessmentWorkflow.js";
import { DeliveryAdvisorWorkflow } from "../core/services/workflows/deliveryAdvisorWorkflow.js";
import { ForecastWorkflow } from "../core/services/workflows/forecastWorkflow.js";
import { MonthlyBillingSummaryWorkflow } from "../core/services/workflows/monthlyBillingSummaryWorkflow.js";
import { ProjectSummaryWorkflow } from "../core/services/workflows/projectSummaryWorkflow.js";
import { RaidExtractionWorkflow } from "../core/services/workflows/raidExtractionWorkflow.js";
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

export const productRoutes = Router();
const resolveTenant = tenantResolutionMiddleware(tenantContextServiceV2);
const validateLicense = licenseValidationMiddleware(licenseServiceV2);
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
