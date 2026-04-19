import type { NextFunction, Request, Response } from "express";
import { employeeSessionService } from "../core/services/auth/EmployeeSessionService.js";

// Minimal authentication middleware for API gateway flow.
export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header("authorization");
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Missing or invalid Authorization header",
      requestId: req.requestId
    });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Empty bearer token",
      requestId: req.requestId
    });
    return;
  }

  const claims = employeeSessionService.verifySession(token);
  if (!claims) {
    res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Invalid or expired employee session",
      requestId: req.requestId
    });
    return;
  }

  req.authUser = { userId: claims.userId, defaultTenantId: claims.tenantId };
  req.userContext = {
    userId: claims.userId,
    tenantIdHint: claims.tenantId,
    role: claims.role,
    employeeCode: claims.employeeCode,
    department: claims.department,
    roleName: claims.roleName
  };

  next();
}
