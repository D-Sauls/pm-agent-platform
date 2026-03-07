import { PromptEngine } from "../prompt/PromptEngine.js";
import { Router } from "express";
import { z } from "zod";
import {
  agentOrchestratorV2,
  licenseServiceV2,
  projectContextServiceV2,
  tenantContextServiceV2,
  usageLogServiceV2,
  weeklyReportWorkflow
} from "../core/container.js";
import { AppError } from "../core/errors/AppError.js";
import type { NormalizedProjectContext } from "../core/models/projectModels.js";
import { ChangeAssessmentWorkflow } from "../core/services/workflows/changeAssessmentWorkflow.js";
import { DeliveryAdvisorWorkflow } from "../core/services/workflows/deliveryAdvisorWorkflow.js";
import { RaidExtractionWorkflow } from "../core/services/workflows/raidExtractionWorkflow.js";
import { authContextMiddleware } from "../core/middleware/AuthContextMiddleware.js";
import { licenseValidationMiddleware } from "../core/middleware/LicenseValidationMiddleware.js";
import { requestLoggingMiddleware } from "../core/middleware/RequestLoggingMiddleware.js";
import { tenantResolutionMiddleware } from "../core/middleware/TenantResolutionMiddleware.js";

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

export const productRoutes = Router();
const resolveTenant = tenantResolutionMiddleware(tenantContextServiceV2);
const validateLicense = licenseValidationMiddleware(licenseServiceV2);
const raidWorkflow = new RaidExtractionWorkflow(new PromptEngine());
const changeWorkflow = new ChangeAssessmentWorkflow(new PromptEngine());
const deliveryWorkflow = new DeliveryAdvisorWorkflow(new PromptEngine());

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
      connectorUsed: projectContext.project.sourceSystem,
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

productRoutes.get("/licenses/:tenantId/validate", async (req, res, next) => {
  try {
    req.requestMetadata = { requestType: "license_validate" };
    const result = await licenseServiceV2.validateTenantLicenseStatus(req.params.tenantId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

productRoutes.get("/connectors/:tenantId/health", resolveTenant, validateLicense, async (req, res, next) => {
  try {
    const tenantContext = await tenantContextServiceV2.resolve(req.params.tenantId);
    const health = await projectContextServiceV2.healthForTenant(tenantContext);
    req.requestMetadata = { requestType: "connector_health_check" };
    res.json({ tenantId: req.params.tenantId, connectors: health });
  } catch (error) {
    next(error);
  }
});
