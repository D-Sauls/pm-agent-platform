import type { NextFunction, Request, Response } from "express";
import { adminAuthService } from "../context/platformContext.js";

// Validates admin bearer token and injects admin principal into request context.
export async function requireAdminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authorization = req.header("authorization");
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ error: "Missing admin bearer token" });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  const adminUser = await adminAuthService.validateToken(token);
  if (!adminUser || !adminUser.isActive) {
    res.status(401).json({ error: "Invalid or expired admin session" });
    return;
  }

  req.adminUser = adminUser;
  next();
}
