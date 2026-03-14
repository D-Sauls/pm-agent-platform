import assert from "node:assert/strict";
import test from "node:test";
import { CourseService } from "../src/core/services/knowledge/CourseService.js";
import { PolicyService } from "../src/core/services/knowledge/PolicyService.js";
import { RecommendationService } from "../src/core/services/knowledge/RecommendationService.js";

test("RecommendationService recommends courses and policies by role", () => {
  const courseService = new CourseService();
  const policyService = new PolicyService();
  const service = new RecommendationService(courseService, policyService);

  courseService.createCourse({
    id: "course-1",
    tenantId: "tenant-acme",
    title: "Finance Onboarding",
    description: "Intro course",
    tags: ["finance"],
    roleTargets: ["Finance Analyst"],
    publishedStatus: "published",
    modules: []
  });
  policyService.createPolicy({
    id: "policy-1",
    tenantId: "tenant-acme",
    title: "Finance Controls",
    category: "compliance",
    documentReference: "sharepoint://finance-controls.pdf",
    tags: ["finance"],
    applicableRoles: ["Finance Analyst"]
  });

  const result = service.recommendForRole("tenant-acme", "Finance Analyst");
  assert.equal(result.recommendedCourses.length, 1);
  assert.equal(result.requiredPolicies.length, 1);
});
