import { AppError } from "../errors/AppError.js";
import type { License, LicenseValidationResult, Tenant } from "../models/tenantModels.js";
import type { LicenseRepository, TenantRepository } from "../repositories/interfaces.js";

export class LicenseService {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly tenantRepository: TenantRepository
  ) {}

  async getLicenseByTenantId(tenantId: string): Promise<License> {
    const license = await this.licenseRepository.getByTenantId(tenantId);
    if (!license) {
      throw new AppError("LICENSE_INACTIVE", `License not found for ${tenantId}`, 404);
    }
    return license;
  }

  async validateTenantLicenseStatus(tenantId: string): Promise<LicenseValidationResult> {
    const license = await this.getLicenseByTenantId(tenantId);
    const now = new Date();

    let status = license.status;
    let valid = status === "active" || status === "trial";
    let reason: string | undefined;

    if (license.expiryDate && license.expiryDate.getTime() < now.getTime()) {
      status = "expired";
      valid = false;
      reason = "License expiry date reached";
    }

    if (status === "inactive") {
      valid = false;
      reason = reason ?? "License inactive";
    }

    const nextLicense: License = {
      ...license,
      status,
      lastValidatedAt: now
    };
    await this.licenseRepository.upsert(nextLicense);

    if (status === "expired") {
      const tenant = await this.tenantRepository.getById(tenantId);
      if (tenant) {
        await this.tenantRepository.update({
          ...tenant,
          status: "suspended",
          licenseStatus: "expired",
          updatedDate: now
        });
      }
    }

    return {
      tenantId,
      valid,
      status,
      reason,
      checkedAt: now
    };
  }

  async ensureTenantLicenseIsActive(tenant: Tenant): Promise<void> {
    const result = await this.validateTenantLicenseStatus(tenant.tenantId);
    if (!result.valid || tenant.status === "suspended") {
      const code = result.status === "expired" ? "LICENSE_EXPIRED" : "LICENSE_INACTIVE";
      throw new AppError(code, result.reason ?? "Tenant license invalid", 403, result);
    }
  }
}
