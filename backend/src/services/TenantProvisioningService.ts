import { createHmac } from "node:crypto";
import { env } from "../config/env.js";
import type { FeatureFlagService } from "./FeatureFlagService.js";
import type { LicenseService } from "./LicenseService.js";
import type { TenantService } from "./TenantService.js";
import type { ConnectorHealthService } from "./ConnectorHealthService.js";
import type { PromptRegistryService } from "./PromptRegistryService.js";
import type { ConnectorProvider, PlanType } from "../models/Tenant.js";

export interface ProvisionTenantInput {
  tenantId: string;
  organizationName: string;
  planType: PlanType;
  enabledConnectors?: ConnectorProvider[];
  primaryConnector?: ConnectorProvider;
  trialMode?: boolean;
}

export interface ProvisionTenantResult {
  tenant: ReturnType<TenantService["createTenant"]>;
  license: ReturnType<LicenseService["activateLicense"]>;
  featureFlags: ReturnType<FeatureFlagService["getFlagsForTenant"]>;
  promptAssignments: ReturnType<PromptRegistryService["listTenantAssignments"]>;
  connectorHealth: ReturnType<ConnectorHealthService["listByTenant"]>;
}

export class TenantProvisioningService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly licenseService: LicenseService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly connectorHealthService: ConnectorHealthService,
    private readonly promptRegistryService: PromptRegistryService
  ) {}

  provisionTenant(input: ProvisionTenantInput): ProvisionTenantResult {
    const existing = this.tenantService.retrieveTenantContext(input.tenantId);
    if (existing) {
      throw new Error(`Tenant ${input.tenantId} already exists`);
    }

    const tenant = this.tenantService.createTenant({
      tenantId: input.tenantId,
      organizationName: input.organizationName,
      planType: input.planType,
      connectorConfig: {
        primaryConnector: input.primaryConnector,
        enabledConnectors: input.enabledConnectors ?? []
      }
    });

    const defaults = this.featureFlagService.getFlagsForTenant(input.tenantId);
    this.tenantService.setTenantFeatureFlags(input.tenantId, defaults.flags);
    this.tenantService.setTenantPromptVersion(input.tenantId, "onboarding_assistant:v1");
    this.promptRegistryService.assignVersionToTenant(input.tenantId, "onboarding_assistant", "v1");

    const license = input.trialMode
      ? this.licenseService.setTrialMode(tenant, true)
      : this.licenseService.activateLicense(tenant);
    license.licenseKey = this.generateLicenseKey(input.tenantId, input.planType);

    for (const connectorName of input.enabledConnectors ?? []) {
      this.connectorHealthService.runManualHealthCheck(input.tenantId, connectorName);
    }

    return {
      tenant: this.tenantService.reactivateTenant(input.tenantId) ?? tenant,
      license,
      featureFlags: defaults,
      promptAssignments: this.promptRegistryService.listTenantAssignments(input.tenantId),
      connectorHealth: this.connectorHealthService.listByTenant(input.tenantId)
    };
  }

  private generateLicenseKey(tenantId: string, planType: PlanType): string {
    return createHmac("sha256", env.licenseSecret)
      .update(`${tenantId}:${planType}`)
      .digest("hex");
  }
}
