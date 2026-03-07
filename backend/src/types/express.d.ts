import type { Tenant } from "../models/Tenant.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        userId: string;
        defaultTenantId?: string;
      };
      tenantId?: string;
      tenantContext?: Tenant;
    }
  }
}

export {};
