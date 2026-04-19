import assert from "node:assert/strict";
import test from "node:test";
import { NextTrainingStepWorkflow } from "../src/core/services/workflows/nextTrainingStepWorkflow.js";

const onboardingRecommendationService = {
  async recommend() {
    return {
      onboardingPath: { id: "onboarding-finance" },
      recommendedCourses: [],
      requiredPolicies: [],
      nextActions: []
    };
  }
} as any;
const onboardingProgressService = {
  async recommendNext() {
    return {
      nextCourseId: "course-a",
      nextPolicyId: null,
      recommendation: "Complete course-a next.",
      completionPercentage: 50
    };
  }
} as any;

test("NextTrainingStepWorkflow returns the next onboarding action", async () => {
  const workflow = new NextTrainingStepWorkflow(onboardingRecommendationService, onboardingProgressService);
  const result = await workflow.execute({
    tenantContext: { tenant: { tenantId: "tenant-acme" } },
    projectContext: { project: { projectId: "knowledge", tenantId: "tenant-acme", sourceSystem: "knowledge", name: "Knowledge", deliveryMode: "hybrid" }, tasks: [], milestones: [], risks: [], issues: [], dependencies: [], statusSummary: "Knowledge" },
    userRequest: "What should I complete next?",
    workflowId: "next_training_step",
    timestamp: new Date(),
    metadata: { userId: "user-1", role: "Finance Analyst", department: "Finance" }
  } as any);

  assert.equal(result.workflowId, "next_training_step");
  assert.equal((result.data as any).nextCourseId, "course-a");
});
