import type { NextFunction, Request, Response } from "express";

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

  req.authUser = {
    userId: token,
    // Optional fallback if tenant is encoded in token as "userId|tenantId".
    defaultTenantId: token.includes("|") ? token.split("|")[1] : undefined
  };

  next();
}
