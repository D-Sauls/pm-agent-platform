import type { NextFunction, Request, Response } from "express";
import { licenseService, tenantService } from "../context/platformContext.js";

// Resolves tenant context and enforces license policy for every tenant-scoped request.
export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerTenantId = req.header("x-tenant-id");
  const tenantId = headerTenantId ?? req.authUser?.defaultTenantId;

  if (!tenantId) {
    res.status(400).json({ error: "Missing tenantId. Set x-tenant-id header." });
    return;
  }

  const tenantContext = tenantService.retrieveTenantContext(tenantId);
  if (!tenantContext) {
    res.status(404).json({ error: `Tenant ${tenantId} not found` });
    return;
  }

  try {
    licenseService.assertLicenseActive(tenantContext);
  } catch (error) {
    const message = error instanceof Error ? error.message : "License inactive";
    res.status(403).json({ error: message });
    return;
  }

  req.tenantId = tenantId;
  req.tenantContext = tenantContext;
  next();
}
