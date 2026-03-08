import type { Tenant } from "../models/Tenant.js";
import type { AdminUser } from "../models/AdminUser.js";
import type { TenantContext } from "../core/models/tenantModels.js";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      correlationId?: string;
      authUser?: {
        userId: string;
        defaultTenantId?: string;
      };
      tenantId?: string;
      legacyTenantContext?: Tenant;
      adminUser?: AdminUser;
      userContext?: {
        userId: string;
        tenantIdHint?: string;
        role: "admin" | "pm" | "readonly";
      };
      tenantContext?: TenantContext;
      requestMetadata?: {
        requestType: string;
        workflowType?: string;
        workflowId?: string;
        forecastType?: string;
        confidenceScore?: number;
        warningsCount?: number;
        connectorUsed?: string | null;
        executionTimeMs?: number;
      };
    }
  }
}

export {};
