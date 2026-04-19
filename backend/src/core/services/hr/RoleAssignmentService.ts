import type { ProvisionedUser, RoleAssignmentOutcome } from "../../models/hrImportModels.js";
import type { ComplianceRequirementService } from "../compliance/ComplianceRequirementService.js";
import type { OnboardingPathService } from "../onboarding/OnboardingPathService.js";
import type { RoleProfileService } from "../onboarding/RoleProfileService.js";
import type { FileHrImportRepository } from "./FileHrImportRepository.js";

export class RoleAssignmentService {
  constructor(
    private readonly roleProfileService: RoleProfileService,
    private readonly onboardingPathService: OnboardingPathService,
    private readonly complianceRequirementService: ComplianceRequirementService,
    private readonly repository: FileHrImportRepository
  ) {}

  async assign(user: ProvisionedUser): Promise<RoleAssignmentOutcome> {
    const warnings: string[] = [];
    const roleProfile =
      user.roleName
        ? await this.roleProfileService.findByRole(user.tenantId, user.roleName, user.department ?? undefined)
        : null;
    if (!roleProfile) {
      warnings.push("No role profile matched; onboarding path assignment skipped.");
    }

    const onboardingPath = roleProfile
      ? await this.onboardingPathService.getByRoleId(user.tenantId, roleProfile.id)
      : null;
    if (roleProfile && !onboardingPath) {
      warnings.push("Role profile matched but no onboarding path exists for that role.");
    }

    const complianceRequirements = user.roleName
      ? this.complianceRequirementService.resolveApplicableRequirements(
          user.tenantId,
          user.roleName,
          user.department ?? undefined
        )
      : [];
    const assignedAt = new Date();
    this.repository.upsertComplianceStatuses(
      complianceRequirements.map((requirement) => ({
        tenantId: user.tenantId,
        userId: user.id,
        requirementId: requirement.id,
        status: "assigned",
        assignedAt,
        dueDate:
          requirement.dueInDays != null
            ? new Date(assignedAt.getTime() + requirement.dueInDays * 86400_000)
            : null,
        completedAt: null,
        lastAcknowledgementId: null
      }))
    );

    const outcome: RoleAssignmentOutcome = {
      userId: user.id,
      roleMatched: Boolean(roleProfile),
      roleProfileId: roleProfile?.id ?? null,
      onboardingPathId: onboardingPath?.id ?? null,
      assignedCourseIds: onboardingPath?.courseIds ?? [],
      assignedPolicyIds: onboardingPath?.policyIds ?? [],
      complianceRequirementIds: complianceRequirements.map((requirement) => requirement.id),
      warnings
    };
    this.repository.recordAssignment(outcome);
    return outcome;
  }
}
