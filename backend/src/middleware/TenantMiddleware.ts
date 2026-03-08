import type { NextFunction, Request, Response } from "express";
import { licenseService, tenantService } from "../context/platformContext.js";

// Resolves tenant context and enforces license policy for every tenant-scoped request.
export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerTenantId = req.header("x-tenant-id");
  const tenantId = headerTenantId ?? req.authUser?.defaultTenantId;

  if (!tenantId) {
    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Missing tenantId. Set x-tenant-id header.",
      requestId: req.requestId
    });
    return;
  }

  const tenantContext = tenantService.retrieveTenantContext(tenantId);
  if (!tenantContext) {
    res.status(404).json({
      code: "TENANT_NOT_FOUND",
      message: `Tenant ${tenantId} not found`,
      requestId: req.requestId
    });
    return;
  }

  try {
    licenseService.assertLicenseActive(tenantContext);
  } catch (error) {
    const message = error instanceof Error ? error.message : "License inactive";
    res.status(403).json({ code: "LICENSE_INACTIVE", message, requestId: req.requestId });
    return;
  }

  req.tenantId = tenantId;
  req.legacyTenantContext = tenantContext;
  next();
}
