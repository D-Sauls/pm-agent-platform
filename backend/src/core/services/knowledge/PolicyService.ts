import { AppError } from "../../errors/AppError.js";
import type { Policy } from "../../models/knowledgeModels.js";

export class PolicyService {
  private readonly policies = new Map<string, Policy>();

  createPolicy(policy: Policy): Policy {
    if (this.policies.has(policy.id)) {
      throw new AppError("VALIDATION_ERROR", `Policy ${policy.id} already exists`, 409);
    }
    this.policies.set(policy.id, policy);
    return policy;
  }

  getPolicyById(tenantId: string, policyId: string): Policy {
    const policy = this.policies.get(policyId);
    if (!policy || policy.tenantId !== tenantId) {
      throw new AppError("PROJECT_NOT_FOUND", `Policy ${policyId} not found`, 404);
    }
    return policy;
  }

  lookupPolicies(
    tenantId: string,
    filters: { category?: string; tag?: string; role?: string; query?: string }
  ): Policy[] {
    const query = filters.query?.toLowerCase();
    return Array.from(this.policies.values()).filter((policy) => {
      if (policy.tenantId !== tenantId) return false;
      if (filters.category && policy.category !== filters.category) return false;
      if (filters.tag && !policy.tags.includes(filters.tag)) return false;
      if (filters.role && !policy.applicableRoles.includes(filters.role)) return false;
      if (
        query &&
        !`${policy.title} ${policy.category} ${policy.tags.join(" ")}`.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }

  seed(policies: Policy[]): void {
    for (const policy of policies) {
      this.policies.set(policy.id, policy);
    }
  }
}
