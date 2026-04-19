import { Router } from "express";
import { z } from "zod";
import { agenticOrchestratorServiceV2 } from "../core/container.js";
import { AppError } from "../core/errors/AppError.js";

export const agentRoutes = Router();

const goalExecuteRequestSchema = z.object({
  tenantId: z.string().min(1).optional(),
  projectId: z.string().optional(),
  message: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
});

agentRoutes.post("/goal-execute", async (req, res, next) => {
  try {
    const parsedRequest = goalExecuteRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid goal execute payload", 400, {
        issues: parsedRequest.error.issues
      });
    }

    const parsed = parsedRequest.data;
    const tenantId = req.tenantId ?? parsed.tenantId;
    if (!tenantId) {
      throw new AppError("TENANT_NOT_FOUND", "tenantId missing from request context", 400);
    }

    const executionStart = Date.now();
    const result = await agenticOrchestratorServiceV2.executeGoal({
      tenantId,
      projectId: parsed.projectId,
      message: parsed.message,
      metadata: parsed.metadata
    });

    req.requestMetadata = {
      requestType: "agent_goal_execute",
      workflowType: `agentic_plan:${result.goalType}`,
      workflowId: "agentic_goal",
      planId: result.planId,
      goalType: result.goalType,
      confidenceScore: result.plannerConfidence,
      warningsCount: result.response.warnings.length,
      connectorUsed: result.response.workflowsExecuted.join(","),
      executionTimeMs: Date.now() - executionStart
    };

    res.json(result);
  } catch (error) {
    next(error);
  }
});
