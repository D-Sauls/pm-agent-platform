export interface PromptVersion {
  promptKey: string;
  version: string;
  text: string;
  createdAt: string;
  isDefault: boolean;
}

export interface TenantPromptAssignment {
  tenantId: string;
  promptKey: string;
  activeVersion: string;
}
