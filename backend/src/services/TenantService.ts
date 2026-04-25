import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";
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

  constructor(private readonly filePath?: string) {
    if (filePath) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        let rows: Tenant[] = [];
        try {
          rows = raw.trim() ? JSON.parse(raw) as Tenant[] : [];
        } catch {
          rows = [];
        }
        for (const tenant of rows) {
          this.tenants.set(tenant.tenantId, tenant);
        }
      }
    }
    if (this.tenants.size === 0) {
      this.seedDefaultTenants();
      this.persist();
    }
  }

  createTenant(input: CreateTenantInput): Tenant {
    const tenant: Tenant = {
      tenantId: input.tenantId,
      organizationName: input.organizationName,
      licenseStatus: "active",
      planType: input.planType,
      createdDate: new Date().toISOString(),
      featureFlags: {},
      promptVersion: "onboarding_assistant:v1",
      connectorConfig: input.connectorConfig ?? { enabledConnectors: [] }
    };
    this.tenants.set(tenant.tenantId, tenant);
    this.persist();
    return tenant;
  }

  storeTenantConfiguration(tenantId: string, config: Tenant["connectorConfig"]): Tenant | null {
    const existing = this.tenants.get(tenantId);
    if (!existing) {
      return null;
    }

    const updated: Tenant = { ...existing, connectorConfig: config };
    this.tenants.set(tenantId, updated);
    this.persist();
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
    this.persist();
    return updated;
  }

  assignPlanType(tenantId: string, planType: Tenant["planType"]): Tenant | null {
    const existing = this.tenants.get(tenantId);
    if (!existing) {
      return null;
    }

    const updated: Tenant = { ...existing, planType };
    this.tenants.set(tenantId, updated);
    this.persist();
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
    this.persist();
    return updated;
  }

  setTenantPromptVersion(tenantId: string, promptVersion: string): Tenant | null {
    const existing = this.tenants.get(tenantId);
    if (!existing) {
      return null;
    }

    const updated: Tenant = { ...existing, promptVersion };
    this.tenants.set(tenantId, updated);
    this.persist();
    return updated;
  }

  private persist(): void {
    if (!this.filePath) {
      return;
    }
    const tempPath = `${this.filePath}.${process.pid}.${process.hrtime.bigint()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(this.listTenants(), null, 2), "utf8");
    fs.renameSync(tempPath, this.filePath);
  }

  private seedDefaultTenants(): void {
    this.createTenant({
      tenantId: env.defaultTenantId,
      organizationName: env.defaultTenantName,
      planType: "enterprise",
      connectorConfig: {
        primaryConnector: "sharepoint",
        enabledConnectors: ["microsoft-graph", "sharepoint", "teams"]
      }
    });
    this.createTenant({
      tenantId: env.secondaryTenantId,
      organizationName: env.secondaryTenantName,
      planType: "starter",
      connectorConfig: {
        primaryConnector: "sharepoint",
        enabledConnectors: ["microsoft-graph", "sharepoint"]
      }
    });
    this.setLicenseStatus(env.secondaryTenantId, "inactive");
  }
}
