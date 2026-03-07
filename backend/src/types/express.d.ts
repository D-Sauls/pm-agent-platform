import type { Tenant } from "../models/Tenant.js";
import type { AdminUser } from "../models/AdminUser.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        userId: string;
        defaultTenantId?: string;
      };
      tenantId?: string;
      tenantContext?: Tenant;
      adminUser?: AdminUser;
    }
  }
}

export {};
