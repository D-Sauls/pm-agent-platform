import type { NextFunction, Request, Response } from "express";
import { UsageLogService } from "../services/UsageLogService.js";

export function requestLoggingMiddleware(usageLogService: UsageLogService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on("finish", () => {
      const tenantId = req.tenantContext?.tenant.tenantId ?? req.params.tenantId ?? "unknown-tenant";
      void usageLogService.recordWorkflowRequest({
        requestId: req.requestId,
        correlationId: req.correlationId,
        tenantId,
        userId: req.userContext?.userId,
        requestType: req.requestMetadata?.requestType ?? `${req.method} ${req.path}`,
        workflowType: req.requestMetadata?.workflowType,
        workflowId: req.requestMetadata?.workflowId,
        forecastType: req.requestMetadata?.forecastType,
        confidenceScore: req.requestMetadata?.confidenceScore,
        connectorUsed: req.requestMetadata?.connectorUsed,
        responseTimeMs: Date.now() - start,
        executionTimeMs: req.requestMetadata?.executionTimeMs,
        success: res.statusCode < 400,
        errorMessage: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null
      });
    });

    next();
  };
}
