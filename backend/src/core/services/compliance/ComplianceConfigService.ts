import type { ComplianceConfig } from "../../models/complianceModels.js";
import fs from "node:fs";
import path from "node:path";

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

function durableWriteJson(filePath: string, value: unknown): void {
  const tempPath = `${filePath}.${process.pid}.${process.hrtime.bigint()}.tmp`;
  const contents = JSON.stringify(value, null, 2);
  fs.writeFileSync(tempPath, contents, "utf8");
  try {
    fs.renameSync(tempPath, filePath);
  } catch {
    fs.rmSync(tempPath, { force: true });
    fs.writeFileSync(filePath, contents, "utf8");
  }
}

export class ComplianceConfigService {
  private readonly configs = new Map<string, ComplianceConfig>();

  constructor(private readonly filePath?: string) {
    if (filePath) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2), "utf8");
      }
    }
  }

  getConfig(tenantId: string): ComplianceConfig {
    return this.readConfigs()[tenantId] ?? defaultComplianceConfig;
  }

  upsertConfig(tenantId: string, config: Partial<ComplianceConfig>): ComplianceConfig {
    const next = {
      ...this.getConfig(tenantId),
      ...config
    };
    const configs = this.readConfigs();
    configs[tenantId] = next;
    this.writeConfigs(configs);
    return next;
  }

  private readConfigs(): Record<string, ComplianceConfig> {
    if (!this.filePath) {
      return Object.fromEntries(this.configs.entries());
    }
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      return raw.trim() ? JSON.parse(raw) as Record<string, ComplianceConfig> : {};
    } catch {
      return {};
    }
  }

  private writeConfigs(configs: Record<string, ComplianceConfig>): void {
    if (!this.filePath) {
      this.configs.clear();
      for (const [tenantId, config] of Object.entries(configs)) {
        this.configs.set(tenantId, config);
      }
      return;
    }
    durableWriteJson(this.filePath, configs);
  }
}
