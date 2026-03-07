import { AppError } from "../errors/AppError.js";
import type { Tenant, TenantContext } from "../models/tenantModels.js";
import type {
  LicenseRepository,
  PromptMappingRepository,
  TenantRepository
} from "../repositories/interfaces.js";

export class TenantService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly licenseRepository: LicenseRepository,
    private readonly promptMappingRepository: PromptMappingRepository
  ) {}

  async createTenant(input: Omit<Tenant, "createdDate" | "updatedDate">): Promise<Tenant> {
    const now = new Date();
    const tenant: Tenant = { ...input, createdDate: now, updatedDate: now };
    await this.tenantRepository.create(tenant);
    await this.promptMappingRepository.setDefaultPromptVersion(
      tenant.tenantId,
      tenant.defaultPromptVersion
    );
    return tenant;
  }

  async getTenantById(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.getById(tenantId);
    if (!tenant) {
      throw new AppError("TENANT_NOT_FOUND", `Tenant ${tenantId} not found`, 404);
    }
    return tenant;
  }

  async listTenants(): Promise<Tenant[]> {
    return this.tenantRepository.list();
  }

  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.getTenantById(tenantId);
    const next: Tenant = { ...tenant, ...updates, tenantId, updatedDate: new Date() };
    await this.tenantRepository.update(next);
    if (updates.defaultPromptVersion !== undefined) {
      await this.promptMappingRepository.setDefaultPromptVersion(tenantId, updates.defaultPromptVersion);
    }
    return next;
  }

  async suspendTenant(tenantId: string): Promise<Tenant> {
    return this.updateTenant(tenantId, { status: "suspended", licenseStatus: "inactive" });
  }

  async reactivateTenant(tenantId: string): Promise<Tenant> {
    return this.updateTenant(tenantId, { status: "active", licenseStatus: "active" });
  }

  async resolveTenantContext(tenantId: string): Promise<TenantContext> {
    const tenant = await this.getTenantById(tenantId);
    const license = await this.licenseRepository.getByTenantId(tenantId);
    if (!license) {
      throw new AppError("LICENSE_INACTIVE", `License not found for ${tenantId}`, 403);
    }
    const mappedPrompt = await this.promptMappingRepository.getDefaultPromptVersion(tenantId);
    return {
      tenant,
      license,
      enabledConnectors: tenant.enabledConnectors,
      defaultPromptVersion: mappedPrompt ?? tenant.defaultPromptVersion,
      featureFlags: tenant.featureFlags
    };
  }
}
