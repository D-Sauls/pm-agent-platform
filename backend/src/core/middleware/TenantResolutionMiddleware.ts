import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { TenantContextService } from "../services/TenantContextService.js";

export function tenantResolutionMiddleware(tenantContextService: TenantContextService) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId =
        req.header("x-tenant-id") ??
        (req.params.tenantId || undefined) ??
        req.userContext?.tenantIdHint ??
        (typeof req.body?.tenantId === "string" ? req.body.tenantId : undefined);

      if (!tenantId) {
        throw new AppError("TENANT_NOT_FOUND", "tenantId missing from request context", 400);
      }

      req.tenantContext = await tenantContextService.resolve(tenantId);
      next();
    } catch (error) {
      next(error);
    }
  };
}
