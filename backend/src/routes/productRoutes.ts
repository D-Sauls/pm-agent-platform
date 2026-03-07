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

export const productRoutes = Router();
const resolveTenant = tenantResolutionMiddleware(tenantContextServiceV2);
const validateLicense = licenseValidationMiddleware(licenseServiceV2);

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
