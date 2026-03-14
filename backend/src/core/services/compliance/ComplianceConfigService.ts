import type { ComplianceConfig } from "../../models/complianceModels.js";

const defaultComplianceConfig: ComplianceConfig = {
  acknowledgementRequiredDefault: true,
  signatureRequiredDefault: false,
  hrOverrideEnabled: true,
  refresherEnabled: true,
  defaultRefresherPeriodDays: 365,
  readReceiptMode: "acceptance_tracking",
  downloadPolicy: "authenticated_only",
  allowedIpRanges: []
};

export class ComplianceConfigService {
  private readonly configs = new Map<string, ComplianceConfig>();

  getConfig(tenantId: string): ComplianceConfig {
    return this.configs.get(tenantId) ?? defaultComplianceConfig;
  }

  upsertConfig(tenantId: string, config: Partial<ComplianceConfig>): ComplianceConfig {
    const next = {
      ...this.getConfig(tenantId),
      ...config
    };
    this.configs.set(tenantId, next);
    return next;
  }
}
