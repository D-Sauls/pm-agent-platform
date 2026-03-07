import type { Tenant } from "../models/Tenant.js";

export interface CreateTenantInput {
  tenantId: string;
  organizationName: string;
  planType: Tenant["planType"];
  connectorConfig?: Tenant["connectorConfig"];
}

// Manages tenant lifecycle and tenant-specific configuration state.
export class TenantService {
  private tenants = new Map<string, Tenant>();

  constructor() {
    this.seedDefaultTenants();
  }

  createTenant(input: CreateTenantInput): Tenant {
    const tenant: Tenant = {
      tenantId: input.tenantId,
      organizationName: input.organizationName,
      licenseStatus: "active",
      planType: input.planType,
      createdDate: new Date().toISOString(),
      featureFlags: {},
      promptVersion: "weekly_report:v1",
      connectorConfig: input.connectorConfig ?? { enabledConnectors: [] }
    };
    this.tenants.set(tenant.tenantId, tenant);
    return tenant;
  }

  storeTenantConfiguration(tenantId: string, config: Tenant["connectorConfig"]): Tenant | null {
    const existing = this.tenants.get(tenantId);
    if (!existing) {
      return null;
    }

    const updated: Tenant = { ...existing, connectorConfig: config };
    this.tenants.set(tenantId, updated);
    return updated;
  }

  retrieveTenantContext(tenantId: string): Tenant | null {
    return this.tenants.get(tenantId) ?? null;
  }

  listTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  setLicenseStatus(tenantId: string, status: Tenant["licenseStatus"]): Tenant | null {
    const existing = this.tenants.get(tenantId);
    if (!existing) {
      return null;
    }

    const updated: Tenant = { ...existing, licenseStatus: status };
    this.tenants.set(tenantId, updated);
    return updated;
  }

  assignPlanType(tenantId: string, planType: Tenant["planType"]): Tenant | null {
    const existing = this.tenants.get(tenantId);
    if (!existing) {
      return null;
    }

    const updated: Tenant = { ...existing, planType };
    this.tenants.set(tenantId, updated);
    return updated;
  }

  suspendTenant(tenantId: string): Tenant | null {
    return this.setLicenseStatus(tenantId, "suspended");
  }

  reactivateTenant(tenantId: string): Tenant | null {
    return this.setLicenseStatus(tenantId, "active");
  }

  setTenantFeatureFlags(tenantId: string, flags: Record<string, boolean>): Tenant | null {
    const existing = this.tenants.get(tenantId);
    if (!existing) {
      return null;
    }

    const updated: Tenant = { ...existing, featureFlags: flags };
    this.tenants.set(tenantId, updated);
    return updated;
  }

  setTenantPromptVersion(tenantId: string, promptVersion: string): Tenant | null {
    const existing = this.tenants.get(tenantId);
    if (!existing) {
      return null;
    }

    const updated: Tenant = { ...existing, promptVersion };
    this.tenants.set(tenantId, updated);
    return updated;
  }

  private seedDefaultTenants(): void {
    this.createTenant({
      tenantId: "tenant-acme",
      organizationName: "Acme Corp",
      planType: "enterprise",
      connectorConfig: {
        primaryConnector: "clickup",
        enabledConnectors: ["clickup", "monday", "microsoft-planner"]
      }
    });
    this.createTenant({
      tenantId: "tenant-beta",
      organizationName: "Beta Industries",
      planType: "starter",
      connectorConfig: {
        primaryConnector: "zoho",
        enabledConnectors: ["zoho"]
      }
    });
    this.setLicenseStatus("tenant-beta", "inactive");
  }
}
