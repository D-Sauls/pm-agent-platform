export interface FeatureFlag {
  key: string;
  description: string;
  defaultEnabled: boolean;
}

export interface TenantFeatureFlags {
  tenantId: string;
  flags: Record<string, boolean>;
}
