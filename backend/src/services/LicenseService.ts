import type { Tenant } from "../models/Tenant.js";

// Validates whether a tenant is allowed to access agent APIs.
export class LicenseService {
  isLicenseActive(tenant: Tenant): boolean {
    return tenant.licenseStatus === "active";
  }

  assertLicenseActive(tenant: Tenant): void {
    if (!this.isLicenseActive(tenant)) {
      throw new Error(
        `Tenant ${tenant.tenantId} license is ${tenant.licenseStatus}. Access is blocked.`
      );
    }
  }
}
