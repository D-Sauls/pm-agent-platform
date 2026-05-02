import type { ComplianceRequirement } from "../../models/complianceModels.js";

export interface ComplianceRequirementStore {
  appendSync(requirement: ComplianceRequirement): void;
  listByTenantSync(tenantId: string): ComplianceRequirement[];
}

export class ComplianceRequirementService {
  private readonly requirements: ComplianceRequirement[] = [];

  constructor(private readonly store?: ComplianceRequirementStore) {}

  createRequirement(requirement: ComplianceRequirement): ComplianceRequirement {
    if (this.store) {
      this.store.appendSync(requirement);
      return requirement;
    }
    this.requirements.push(requirement);
    return requirement;
  }

  listRequirements(tenantId: string): ComplianceRequirement[] {
    if (this.store) {
      return this.store.listByTenantSync(tenantId);
    }
    return this.requirements.filter((requirement) => requirement.tenantId === tenantId);
  }

  resolveApplicableRequirements(
    tenantId: string,
    role: string,
    department?: string
  ): ComplianceRequirement[] {
    return this.listRequirements(tenantId).filter((requirement) => {
      const appliesToRole =
        requirement.appliesToRoles.length === 0 || requirement.appliesToRoles.includes(role);
      const appliesToDepartment =
        !department ||
        !requirement.appliesToDepartments ||
        requirement.appliesToDepartments.length === 0 ||
        requirement.appliesToDepartments.includes(department);
      return appliesToRole && appliesToDepartment;
    });
  }
}
