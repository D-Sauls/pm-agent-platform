import assert from "node:assert/strict";
import test from "node:test";
import { OnboardingRecommendationService } from "../src/core/services/onboarding/OnboardingRecommendationService.js";

const roleProfileService = {
  async findByRole() {
    return { id: "role-finance-analyst", tenantId: "tenant-acme", roleName: "Finance Analyst", department: "Finance", description: "Finance" };
  }
} as any;
const onboardingPathService = {
  async getByRoleId() {
    return { id: "onboarding-finance", tenantId: "tenant-acme", roleId: "role-finance-analyst", courseIds: ["course-a"], policyIds: ["policy-a"], estimatedDuration: 120, version: "v1" };
  }
} as any;
const courseService = {
  getCourseCatalog() { return [{ id: "course-a", title: "Finance 101", roleTargets: ["Finance Analyst"], tags: [], tenantId: "tenant-acme", description: "", modules: [], publishedStatus: "published" }]; },
  getCourseById() { return { id: "course-a", title: "Finance 101", roleTargets: ["Finance Analyst"], tags: [], tenantId: "tenant-acme", description: "", modules: [], publishedStatus: "published" }; }
} as any;
const policyService = {
  lookupPolicies() { return [{ id: "policy-a", title: "Finance Policy", applicableRoles: ["Finance Analyst"], tenantId: "tenant-acme", category: "finance", documentReference: "", tags: [] }]; }
} as any;
const complianceRequirementService = { listRequirements() { return [{ appliesToRoles: ["Finance Analyst"] }]; } } as any;

test("OnboardingRecommendationService builds next actions from role resources", async () => {
  const service = new OnboardingRecommendationService(
    roleProfileService,
    onboardingPathService,
    courseService,
    policyService,
    complianceRequirementService
  );
  const result = await service.recommend("tenant-acme", "Finance Analyst", "Finance");
  assert.equal(result.recommendedCourses.length, 1);
  assert.equal(result.requiredPolicies.length, 1);
  assert.ok(result.nextActions[0]?.includes("Start"));
});
