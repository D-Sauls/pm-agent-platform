import { getAdminJson } from "../../api/adminClient";
import { defaultTenantId } from "../../config/tenantConfig.js";

const ADMIN_TENANT_SCOPE_KEY = "onboarding_admin_tenant_scope";

export interface AdminTenantOption {
  tenantId: string;
  organizationName: string;
  licenseStatus: string;
  planType: string;
}

export function getAdminTenantId(): string {
  if (typeof window === "undefined") {
    return defaultTenantId();
  }
  try {
    return window.localStorage?.getItem(ADMIN_TENANT_SCOPE_KEY) ?? defaultTenantId();
  } catch {
    return defaultTenantId();
  }
}

export function setAdminTenantId(tenantId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (tenantId) {
      window.localStorage?.setItem(ADMIN_TENANT_SCOPE_KEY, tenantId);
    } else {
      window.localStorage?.removeItem(ADMIN_TENANT_SCOPE_KEY);
    }
  } catch {
    // Tenant selection should keep working even when browser storage is blocked.
  }
}

export async function loadAdminTenantOptions(): Promise<AdminTenantOption[]> {
  return getAdminJson<AdminTenantOption[]>("/tenants");
}
