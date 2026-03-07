import type { NextFunction, Request, Response } from "express";

// Stub identity extraction for now; ready for future Entra token validation integration.
export function authContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authorization = req.header("authorization");
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    req.userContext = { userId: "anonymous", role: "readonly" };
    next();
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  const [userId, tenantIdHint, roleHint] = token.split("|");
  req.userContext = {
    userId: userId || "unknown-user",
    tenantIdHint: tenantIdHint || undefined,
    role: (roleHint as "admin" | "pm" | "readonly" | undefined) ?? "pm"
  };
  next();
}
