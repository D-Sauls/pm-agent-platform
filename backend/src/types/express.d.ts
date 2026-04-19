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
        role: "employee" | "manager" | "admin" | "readonly";
        employeeCode?: string;
        department?: string | null;
        roleName?: string | null;
      };
      tenantContext?: TenantContext;
      requestMetadata?: {
        requestType: string;
        workflowType?: string;
        workflowId?: string;
        planId?: string;
        goalType?: string;
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
