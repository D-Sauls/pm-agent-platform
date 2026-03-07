import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";

export function errorHandlerMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof AppError) {
    res.status(error.httpStatus).json({
      code: error.code,
      message: error.message,
      details: error.details
    });
    return;
  }

  if (error instanceof Error) {
    res.status(500).json({
      code: "WORKFLOW_EXECUTION_FAILED",
      message: error.message
    });
    return;
  }

  res.status(500).json({ code: "WORKFLOW_EXECUTION_FAILED", message: "Unexpected error" });
}
