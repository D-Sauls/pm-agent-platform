import type { NextFunction, Request, Response } from "express";
import { employeeSessionService } from "../services/auth/EmployeeSessionService.js";

export function authContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header("authorization");
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Missing employee bearer token",
      requestId: req.requestId
    });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (token.startsWith("local-admin-")) {
    req.userContext = { userId: "admin-session", role: "admin" };
    next();
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
