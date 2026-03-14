import type { Course, Policy } from "../../models/knowledgeModels.js";
import { CourseService } from "./CourseService.js";
import { PolicyService } from "./PolicyService.js";

export class RecommendationService {
  constructor(
    private readonly courseService: CourseService,
    private readonly policyService: PolicyService
  ) {}

  recommendForRole(
    tenantId: string,
    role: string,
    department?: string
  ): {
    recommendedCourses: Course[];
    requiredPolicies: Policy[];
    onboardingPath: string[];
  } {
    const normalizedRole = role.toLowerCase();
    const normalizedDepartment = department?.toLowerCase();
    const recommendedCourses = this.courseService
      .getCourseCatalog(tenantId, true)
      .filter(
        (course) =>
          course.roleTargets.length === 0 ||
          course.roleTargets.some((target) => target.toLowerCase() === normalizedRole)
      );

    const requiredPolicies = this.policyService.lookupPolicies(tenantId, {}).filter((policy) =>
      policy.applicableRoles.some((applicableRole) => {
        const normalizedApplicableRole = applicableRole.toLowerCase();
        return normalizedApplicableRole === normalizedRole || normalizedApplicableRole === normalizedDepartment;
      })
    );

    return {
      recommendedCourses,
      requiredPolicies,
      onboardingPath: recommendedCourses.slice(0, 3).map((course) => course.title)
    };
  }
}
