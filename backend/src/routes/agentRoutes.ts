import { Router } from "express";
import { z } from "zod";
import { agenticOrchestratorServiceV2 } from "../core/container.js";
import { AppError } from "../core/errors/AppError.js";

export const agentRoutes = Router();

const goalExecuteRequestSchema = z.object({
  tenantId: z.string().min(1).optional(),
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
    const userContext = req.userContext;
    const result = await agenticOrchestratorServiceV2.executeGoal({
      tenantId,
      message: parsed.message,
      metadata: {
        ...(parsed.metadata ?? {}),
        userId: userContext?.userId,
        role: userContext?.roleName ?? userContext?.role,
        department: userContext?.department,
        employeeCode: userContext?.employeeCode
      }
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
