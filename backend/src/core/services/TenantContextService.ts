import type { TenantContext } from "../models/tenantModels.js";
import { LicenseService } from "./LicenseService.js";
import { TenantService } from "./TenantService.js";

export class TenantContextService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly licenseService: LicenseService
  ) {}

  async resolve(tenantId: string): Promise<TenantContext> {
    const context = await this.tenantService.resolveTenantContext(tenantId);
    await this.licenseService.ensureTenantLicenseIsActive(context.tenant);
    return context;
  }
}
