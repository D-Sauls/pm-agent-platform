import type { FeatureFlag, TenantFeatureFlags } from "../models/FeatureFlag.js";

// Abstraction for feature flag storage; can later be backed by Azure App Configuration.
export class FeatureFlagService {
  private globalFlags: FeatureFlag[] = [
    { key: "assistantPromptV2", description: "Enable improved onboarding assistant prompt", defaultEnabled: true },
    { key: "hrImportPreview", description: "Enable HR import dry-run and row preview", defaultEnabled: true },
    { key: "complianceEvidenceReview", description: "Enable compliance evidence review queues", defaultEnabled: false }
  ];

  private tenantFlags = new Map<string, TenantFeatureFlags>();

  listGlobalFlags(): FeatureFlag[] {
    return this.globalFlags;
  }

  setGlobalDefault(flagKey: string, enabled: boolean): FeatureFlag | null {
    const idx = this.globalFlags.findIndex((flag) => flag.key === flagKey);
    if (idx < 0) {
      return null;
    }
    this.globalFlags[idx] = { ...this.globalFlags[idx], defaultEnabled: enabled };
    return this.globalFlags[idx];
  }

  getFlagsForTenant(tenantId: string): TenantFeatureFlags {
    const existing = this.tenantFlags.get(tenantId);
    if (existing) {
      return existing;
    }

    const seeded: TenantFeatureFlags = {
      tenantId,
      flags: Object.fromEntries(this.globalFlags.map((flag) => [flag.key, flag.defaultEnabled]))
    };
    this.tenantFlags.set(tenantId, seeded);
    return seeded;
  }

  setFlagForTenant(tenantId: string, flagKey: string, enabled: boolean): TenantFeatureFlags {
    const current = this.getFlagsForTenant(tenantId);
    const next: TenantFeatureFlags = {
      tenantId,
      flags: {
        ...current.flags,
        [flagKey]: enabled
      }
    };
    this.tenantFlags.set(tenantId, next);
    return next;
  }
}
