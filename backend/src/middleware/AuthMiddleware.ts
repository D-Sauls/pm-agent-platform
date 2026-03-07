import type { NextFunction, Request, Response } from "express";

// Minimal authentication middleware for API gateway flow.
export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header("authorization");
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Empty bearer token" });
    return;
  }

  req.authUser = {
    userId: token,
    // Optional fallback if tenant is encoded in token as "userId|tenantId".
    defaultTenantId: token.includes("|") ? token.split("|")[1] : undefined
  };

  next();
}
