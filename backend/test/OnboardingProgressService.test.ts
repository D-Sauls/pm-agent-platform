import assert from "node:assert/strict";
import test from "node:test";
import { OnboardingProgressService } from "../src/core/services/onboarding/OnboardingProgressService.js";

const onboardingPathService = {
  getById() {
    return { id: "onboarding-finance", tenantId: "tenant-acme", roleId: "role-finance", courseIds: ["course-a"], policyIds: ["policy-a"], estimatedDuration: 120, version: "v1" };
  }
} as any;
const learningProgressService = {
  calculateCourseProgress() {
    return { progressPercent: 100, completedLessons: 1, totalLessons: 1, status: "completed" };
  }
} as any;
const acknowledgementService = {
  findHistory() {
    return [{ subjectId: "policy-a", status: "completed" }];
  }
} as any;
const courseService = { getCourseById() { return { id: "course-a", modules: [] }; } } as any;
const policyService = { getPolicyById() { return { id: "policy-a" }; } } as any;

test("OnboardingProgressService calculates completion and next step", () => {
  const service = new OnboardingProgressService(
    onboardingPathService,
    learningProgressService,
    acknowledgementService,
    courseService,
    policyService
  );
  const progress = service.calculateProgress("tenant-acme", "user-1", "onboarding-finance");
  assert.equal(progress.completionPercentage, 100);
  const next = service.recommendNext("tenant-acme", "user-1", "onboarding-finance");
  assert.equal(next.recommendation, "Onboarding path is complete.");
});
