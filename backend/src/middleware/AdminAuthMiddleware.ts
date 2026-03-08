import type { NextFunction, Request, Response } from "express";
import { adminAuthService } from "../context/platformContext.js";

// Validates admin bearer token and injects admin principal into request context.
export async function requireAdminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authorization = req.header("authorization");
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Missing admin bearer token",
      requestId: req.requestId
    });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  const adminUser = await adminAuthService.validateToken(token);
  if (!adminUser || !adminUser.isActive) {
    res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Invalid or expired admin session",
      requestId: req.requestId
    });
    return;
  }

  req.adminUser = adminUser;
  next();
}
