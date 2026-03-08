import type { NextFunction, Request, Response } from "express";
import { ConnectorTelemetryService } from "./ConnectorTelemetryService.js";
import { LoggingService } from "./LoggingService.js";
import { WorkflowTelemetryService } from "./WorkflowTelemetryService.js";

function mapConnectorStatus(httpStatus: number): "healthy" | "degraded" | "unhealthy" {
  if (httpStatus < 400) {
    return "healthy";
  }
  if (httpStatus < 500) {
    return "degraded";
  }
  return "unhealthy";
}

export function requestLifecycleMiddleware(
  logger: LoggingService,
  workflowTelemetryService: WorkflowTelemetryService,
  connectorTelemetryService: ConnectorTelemetryService
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    logger.debug("request.start", {
      requestId: req.requestId,
      method: req.method,
      path: req.path
    });

    res.on("finish", () => {
      const responseTimeMs = Date.now() - start;
      const tenantId = req.tenantContext?.tenant.tenantId ?? req.tenantId ?? req.params.tenantId;
      const workflowId = req.requestMetadata?.workflowId;
      const workflowType = req.requestMetadata?.workflowType;
      const connectorUsed = req.requestMetadata?.connectorUsed ?? null;
      const success = res.statusCode < 400;

      logger.info("request.finish", {
        requestId: req.requestId,
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTimeMs,
        tenantId,
        workflowId,
        workflowType,
        connectorUsed
      });

      if (workflowId || workflowType) {
        workflowTelemetryService.record({
          requestId: req.requestId ?? "unknown-request",
          tenantId,
          workflowId,
          workflowType,
          connectorUsed,
          success,
          responseTimeMs,
          warningsCount: req.requestMetadata?.warningsCount,
          errorCode: success ? undefined : `HTTP_${res.statusCode}`,
          timestamp: new Date().toISOString()
        });
      }

      if (connectorUsed || req.path.includes("/connectors/")) {
        connectorTelemetryService.record({
          requestId: req.requestId ?? "unknown-request",
          tenantId: tenantId ?? "unknown-tenant",
          connectorName: connectorUsed ?? "unknown",
          operation: req.requestMetadata?.requestType ?? `${req.method} ${req.path}`,
          status: mapConnectorStatus(res.statusCode),
          responseTimeMs,
          reason: success ? undefined : `HTTP_${res.statusCode}`
        });
      }
    });

    next();
  };
}
