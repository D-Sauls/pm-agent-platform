import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { LicenseService } from "../services/LicenseService.js";

export function licenseValidationMiddleware(licenseService: LicenseService) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenant = req.tenantContext?.tenant;
      if (!tenant) {
        throw new AppError("TENANT_NOT_FOUND", "Tenant context missing before license validation", 400);
      }
      await licenseService.ensureTenantLicenseIsActive(tenant);
      next();
    } catch (error) {
      next(error);
    }
  };
}
