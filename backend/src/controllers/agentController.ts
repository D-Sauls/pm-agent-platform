import { Request, Response } from "express";
import { agentOrchestrator } from "../orchestration/agentOrchestrator.js";
import { usageLogService } from "../context/platformContext.js";
import {
  agentRequestSchema,
  agentResponseSchema,
  type AgentRequestDto
} from "../schemas/agentSchemas.js";

export async function handleAgentResponse(req: Request, res: Response) {
  const startTime = Date.now();
  const parsedRequest = agentRequestSchema.safeParse(req.body);
  if (!parsedRequest.success) {
    return res.status(400).json({
      error: "Invalid request payload",
      details: parsedRequest.error.flatten()
    });
  }

  const { projectId, userInput, deliveryMode, requestType } = parsedRequest.data as AgentRequestDto;
  const result = await agentOrchestrator.run({
    tenantId: req.tenantId,
    projectId,
    userInput,
    deliveryMode,
    requestType
  });
  const parsedResponse = agentResponseSchema.safeParse(result);
  if (!parsedResponse.success) {
    return res.status(500).json({
      error: "Invalid response payload from orchestrator",
      details: parsedResponse.error.flatten()
    });
  }

  const responseTime = Date.now() - startTime;
  usageLogService.recordUsage({
    tenantId: req.tenantId ?? "unknown-tenant",
    requestType: parsedResponse.data.operation,
    timestamp: new Date().toISOString(),
    connectorUsed: parsedResponse.data.connectorUsed ?? "internal-model",
    responseTime
  });

  res.json(parsedResponse.data);
}
