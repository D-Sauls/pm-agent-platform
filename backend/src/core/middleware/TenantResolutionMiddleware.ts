import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { TenantContextService } from "../services/TenantContextService.js";

export function tenantResolutionMiddleware(tenantContextService: TenantContextService) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const requestedTenantId =
        req.header("x-tenant-id") ??
        (req.params.tenantId || undefined) ??
        (typeof req.query?.tenantId === "string" ? req.query.tenantId : undefined) ??
        (typeof req.body?.tenantId === "string" ? req.body.tenantId : undefined);
      const tenantId = req.userContext?.tenantIdHint ?? requestedTenantId;

      if (!tenantId) {
        throw new AppError("TENANT_NOT_FOUND", "tenantId missing from request context", 400);
      }
      if (req.userContext?.tenantIdHint && requestedTenantId && requestedTenantId !== req.userContext.tenantIdHint) {
        throw new AppError("UNAUTHORIZED", "Tenant context does not match authenticated session", 403);
      }

      req.tenantContext = await tenantContextService.resolve(tenantId);
      next();
    } catch (error) {
      next(error);
    }
  };
}
