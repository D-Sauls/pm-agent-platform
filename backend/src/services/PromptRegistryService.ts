import type { PromptVersion, TenantPromptAssignment } from "../models/PromptVersion.js";

// Manages prompt version registry and per-tenant active version assignment.
export class PromptRegistryService {
  private versions: PromptVersion[] = [
    {
      promptKey: "onboarding_assistant",
      version: "v1",
      text: "Guide employees through assigned onboarding, learning, policy, and compliance tasks.",
      createdAt: new Date().toISOString(),
      isDefault: true
    },
    {
      promptKey: "onboarding_assistant",
      version: "v2",
      text: "Answer onboarding and compliance questions with explicit source context and safe next actions.",
      createdAt: new Date().toISOString(),
      isDefault: false
    }
  ];

  private assignments = new Map<string, TenantPromptAssignment[]>();

  listPrompts(): string[] {
    return Array.from(new Set(this.versions.map((entry) => entry.promptKey)));
  }

  listPromptVersions(promptKey: string): PromptVersion[] {
    return this.versions.filter((entry) => entry.promptKey === promptKey);
  }

  markDefault(promptKey: string, version: string): PromptVersion[] {
    this.versions = this.versions.map((entry) =>
      entry.promptKey === promptKey ? { ...entry, isDefault: entry.version === version } : entry
    );
    return this.listPromptVersions(promptKey);
  }

  assignVersionToTenant(tenantId: string, promptKey: string, version: string): TenantPromptAssignment {
    const existing = this.assignments.get(tenantId) ?? [];
    const withoutPrompt = existing.filter((assignment) => assignment.promptKey !== promptKey);
    const nextAssignment: TenantPromptAssignment = { tenantId, promptKey, activeVersion: version };
    const next = [...withoutPrompt, nextAssignment];
    this.assignments.set(tenantId, next);
    return nextAssignment;
  }

  rollbackTenantPrompt(tenantId: string, promptKey: string, targetVersion: string): TenantPromptAssignment {
    return this.assignVersionToTenant(tenantId, promptKey, targetVersion);
  }

  listTenantAssignments(tenantId: string): TenantPromptAssignment[] {
    return this.assignments.get(tenantId) ?? [];
  }
}
