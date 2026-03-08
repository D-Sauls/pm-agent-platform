import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { env } from "../../config/env.js";
import { loggingService } from "../../observability/runtime.js";

export function errorHandlerMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId;

  if (error instanceof AppError) {
    loggingService.warn("request.error", {
      requestId,
      code: error.code,
      message: error.message,
      httpStatus: error.httpStatus,
      path: req.path,
      method: req.method,
      tenantId: req.tenantContext?.tenant.tenantId ?? req.tenantId
    });
    res.status(error.httpStatus).json({
      code: error.code,
      message: error.message,
      requestId,
      details: error.details
    });
    return;
  }

  if (error instanceof Error) {
    loggingService.error("request.unhandled_error", {
      requestId,
      message: error.message,
      stack: env.nodeEnv === "development" ? error.stack : undefined,
      path: req.path,
      method: req.method
    });
    res.status(500).json({
      code: "WORKFLOW_EXECUTION_FAILED",
      message:
        env.nodeEnv === "development"
          ? error.message
          : "An unexpected error occurred while processing the request.",
      requestId,
      details: env.nodeEnv === "development" ? { stack: error.stack } : undefined
    });
    return;
  }

  loggingService.error("request.unknown_error", {
    requestId,
    path: req.path,
    method: req.method
  });
  res.status(500).json({
    code: "WORKFLOW_EXECUTION_FAILED",
    message: "Unexpected error",
    requestId
  });
}
