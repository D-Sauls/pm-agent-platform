import type { PlanType } from "./Tenant.js";

export interface License {
  tenantId: string;
  status: "active" | "suspended" | "trial";
  planType: PlanType;
  trialMode: boolean;
  licenseKey?: string;
  expiryDate?: string;
  latestValidationResult: "valid" | "invalid" | "pending";
  updatedAt: string;
}
