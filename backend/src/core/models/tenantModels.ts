export type TenantStatus = "active" | "suspended" | "trial";
export type LicenseStatus = "active" | "inactive" | "expired" | "trial";
export type PlanType = "starter" | "professional" | "enterprise";
export type TenantUserRole = "admin" | "pm" | "readonly";

export interface Tenant {
  tenantId: string;
  organizationName: string;
  status: TenantStatus;
  licenseStatus: LicenseStatus;
  planType: PlanType;
  createdDate: Date;
  updatedDate: Date;
  defaultPromptVersion: string | null;
  enabledConnectors: string[];
  featureFlags: string[];
  metadata?: Record<string, unknown>;
}

export interface TenantUser {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  role: TenantUserRole;
  createdDate: Date;
}

export interface License {
  tenantId: string;
  status: LicenseStatus;
  planType: PlanType;
  expiryDate: Date | null;
  trialEndsAt: Date | null;
  lastValidatedAt: Date | null;
}

export interface UsageLog {
  id: string;
  requestId?: string;
  correlationId?: string;
  tenantId: string;
  userId?: string;
  requestType: string;
  workflowType?: string;
  workflowId?: string;
  forecastType?: string;
  confidenceScore?: number;
  connectorUsed?: string | null;
  responseTimeMs?: number;
  executionTimeMs?: number;
  success: boolean;
  timestamp: Date;
  errorMessage?: string | null;
}

export interface AdminAuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  tenantId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface TenantContext {
  tenant: Tenant;
  license: License;
  enabledConnectors: string[];
  defaultPromptVersion: string | null;
  featureFlags: string[];
}

export interface LicenseValidationResult {
  tenantId: string;
  valid: boolean;
  status: LicenseStatus;
  reason?: string;
  checkedAt: Date;
}
