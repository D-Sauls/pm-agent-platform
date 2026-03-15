import type { ComplianceRequirementService } from "../compliance/ComplianceRequirementService.js";
import type { Course } from "../../models/knowledgeModels.js";
import type { OnboardingPath, RoleProfile } from "../../models/onboardingModels.js";
import { CourseService } from "../knowledge/CourseService.js";
import { PolicyService } from "../knowledge/PolicyService.js";
import { OnboardingPathService } from "./OnboardingPathService.js";
import { RoleProfileService } from "./RoleProfileService.js";

export class OnboardingRecommendationService {
  constructor(
    private readonly roleProfileService: RoleProfileService,
    private readonly onboardingPathService: OnboardingPathService,
    private readonly courseService: CourseService,
    private readonly policyService: PolicyService,
    private readonly complianceRequirementService: ComplianceRequirementService
  ) {}

  recommend(tenantId: string, roleName: string, department?: string): {
    roleProfile: RoleProfile | null;
    onboardingPath: OnboardingPath | null;
    recommendedCourses: Course[];
    requiredPolicies: ReturnType<PolicyService["lookupPolicies"]>;
    nextActions: string[];
  } {
    const roleProfile = this.roleProfileService.findByRole(tenantId, roleName, department);
    const onboardingPath = roleProfile
      ? this.onboardingPathService.getByRoleId(tenantId, roleProfile.id)
      : null;

    const roleCourses = this.courseService
      .getCourseCatalog(tenantId, true)
      .filter((course) => course.roleTargets.length === 0 || course.roleTargets.includes(roleName));
    const requiredPolicies = this.policyService.lookupPolicies(tenantId, { role: roleName });

    const recommendedCourses = onboardingPath
      ? onboardingPath.courseIds
          .map((courseId) => roleCourses.find((course) => course.id === courseId) ?? this.courseService.getCourseById(tenantId, courseId))
      : roleCourses;

    const nextActions = [
      recommendedCourses[0] ? `Start ${recommendedCourses[0].title}` : null,
      requiredPolicies[0] ? `Review ${requiredPolicies[0].title}` : null,
      this.complianceRequirementService
        .listRequirements(tenantId)
        .find((requirement) => requirement.appliesToRoles.includes(roleName))
        ? `Confirm mandatory compliance items for ${roleName}`
        : null
    ].filter(Boolean) as string[];

    return {
      roleProfile,
      onboardingPath,
      recommendedCourses,
      requiredPolicies,
      nextActions
    };
  }
}
