import type { ComplianceRequirement } from "../../models/complianceModels.js";

export class ComplianceRequirementService {
  private readonly requirements: ComplianceRequirement[] = [];

  createRequirement(requirement: ComplianceRequirement): ComplianceRequirement {
    this.requirements.push(requirement);
    return requirement;
  }

  listRequirements(tenantId: string): ComplianceRequirement[] {
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
