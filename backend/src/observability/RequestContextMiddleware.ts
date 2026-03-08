import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id") ?? req.header("x-correlation-id");
  const requestId = incoming?.trim() || randomUUID();
  req.requestId = requestId;
  req.correlationId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
