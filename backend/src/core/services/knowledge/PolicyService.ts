import { AppError } from "../../errors/AppError.js";
import type { Policy } from "../../models/knowledgeModels.js";

export interface PolicyCatalogRepository {
  upsert(policy: Policy): Policy;
  getById(tenantId: string, policyId: string): Policy | null;
  listByTenant(tenantId: string): Policy[];
}

export class PolicyService {
  private readonly policies = new Map<string, Policy>();

  constructor(private readonly repository?: PolicyCatalogRepository) {}

  createPolicy(policy: Policy): Policy {
    if (this.repository?.getById(policy.tenantId, policy.id) || this.policies.has(policy.id)) {
      throw new AppError("VALIDATION_ERROR", `Policy ${policy.id} already exists`, 409);
    }
    if (this.repository) {
      return this.repository.upsert(policy);
    }
    this.policies.set(policy.id, policy);
    return policy;
  }

  getPolicyById(tenantId: string, policyId: string): Policy {
    const stored = this.repository?.getById(tenantId, policyId);
    if (stored) {
      return stored;
    }
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
    const policies = this.repository?.listByTenant(tenantId) ?? Array.from(this.policies.values());
    return policies.filter((policy) => {
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
      if (this.repository) {
        this.repository.upsert(policy);
        continue;
      }
      this.policies.set(policy.id, policy);
    }
  }
}
