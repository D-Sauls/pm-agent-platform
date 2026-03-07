import type { Tenant } from "../models/Tenant.js";
import type { License } from "../models/License.js";

// Validates whether a tenant is allowed to access agent APIs.
export class LicenseService {
  private licenses = new Map<string, License>();

  initializeForTenant(tenant: Tenant): License {
    const existing = this.licenses.get(tenant.tenantId);
    if (existing) {
      return existing;
    }

    const status: License["status"] =
      tenant.licenseStatus === "active"
        ? "active"
        : tenant.licenseStatus === "suspended"
          ? "suspended"
          : "trial";
    const seeded: License = {
      tenantId: tenant.tenantId,
      status,
      trialMode: status === "trial",
      planType: tenant.planType,
      latestValidationResult: status === "active" ? "valid" : "invalid",
      updatedAt: new Date().toISOString()
    };
    this.licenses.set(tenant.tenantId, seeded);
    return seeded;
  }

  isLicenseActive(tenant: Tenant): boolean {
    const license = this.initializeForTenant(tenant);
    return license.status === "active" || license.status === "trial";
  }

  assertLicenseActive(tenant: Tenant): void {
    if (!this.isLicenseActive(tenant)) {
      throw new Error(
        `Tenant ${tenant.tenantId} license is ${tenant.licenseStatus}. Access is blocked.`
      );
    }
  }

  getLicense(tenantId: string): License | null {
    return this.licenses.get(tenantId) ?? null;
  }

  listLicenses(): License[] {
    return Array.from(this.licenses.values());
  }

  activateLicense(tenant: Tenant): License {
    const next: License = {
      tenantId: tenant.tenantId,
      status: "active",
      trialMode: false,
      planType: tenant.planType,
      expiryDate: undefined,
      latestValidationResult: "valid",
      updatedAt: new Date().toISOString()
    };
    this.licenses.set(tenant.tenantId, next);
    return next;
  }

  suspendLicense(tenant: Tenant): License {
    const existing = this.initializeForTenant(tenant);
    const next: License = {
      ...existing,
      status: "suspended",
      trialMode: false,
      latestValidationResult: "invalid",
      updatedAt: new Date().toISOString()
    };
    this.licenses.set(tenant.tenantId, next);
    return next;
  }

  setTrialMode(tenant: Tenant, enabled: boolean): License {
    const existing = this.initializeForTenant(tenant);
    const next: License = {
      ...existing,
      status: enabled ? "trial" : "active",
      trialMode: enabled,
      latestValidationResult: "valid",
      updatedAt: new Date().toISOString()
    };
    this.licenses.set(tenant.tenantId, next);
    return next;
  }

  setExpiryDate(tenant: Tenant, expiryDate: string): License {
    const existing = this.initializeForTenant(tenant);
    const next: License = {
      ...existing,
      expiryDate,
      updatedAt: new Date().toISOString()
    };
    this.licenses.set(tenant.tenantId, next);
    return next;
  }

  validateLicense(tenant: Tenant): License {
    const existing = this.initializeForTenant(tenant);
    const now = Date.now();
    const expired = existing.expiryDate ? new Date(existing.expiryDate).getTime() < now : false;
    const next: License = {
      ...existing,
      latestValidationResult: expired || existing.status === "suspended" ? "invalid" : "valid",
      updatedAt: new Date().toISOString()
    };
    this.licenses.set(tenant.tenantId, next);
    return next;
  }
}
