import type { AcknowledgementService } from "../compliance/AcknowledgementService.js";
import { CourseService } from "../knowledge/CourseService.js";
import { LearningProgressService } from "../knowledge/LearningProgressService.js";
import type { OnboardingProgress } from "../../models/onboardingModels.js";
import { OnboardingPathService } from "./OnboardingPathService.js";
import { PolicyService } from "../knowledge/PolicyService.js";

export class OnboardingProgressService {
  constructor(
    private readonly onboardingPathService: OnboardingPathService,
    private readonly learningProgressService: LearningProgressService,
    private readonly acknowledgementService: AcknowledgementService,
    private readonly courseService: CourseService,
    private readonly policyService: PolicyService
  ) {}

  async calculateProgress(tenantId: string, userId: string, onboardingPathId: string): Promise<OnboardingProgress> {
    const path = await this.onboardingPathService.getById(tenantId, onboardingPathId);
    const completedItems: string[] = [];

    for (const courseId of path.courseIds) {
      const course = this.courseService.getCourseById(tenantId, courseId);
      const progress = this.learningProgressService.calculateCourseProgress(tenantId, userId, course);
      if (progress.status === "completed") {
        completedItems.push(courseId);
      }
    }

    const acknowledgements = this.acknowledgementService.findHistory({ tenantId, userId });
    for (const policyId of path.policyIds) {
      this.policyService.getPolicyById(tenantId, policyId);
      if (acknowledgements.some((entry) => entry.subjectId === policyId && entry.status === "completed")) {
        completedItems.push(policyId);
      }
    }

    const allItems = [...path.courseIds, ...path.policyIds];
    const remainingItems = allItems.filter((itemId) => !completedItems.includes(itemId));
    const completionPercentage = allItems.length === 0 ? 100 : Math.round((completedItems.length / allItems.length) * 100);

    return {
      userId,
      onboardingPathId: path.id,
      completedItems,
      remainingItems,
      completionPercentage
    };
  }

  async recommendNext(
    tenantId: string,
    userId: string,
    onboardingPathId: string
  ): Promise<{ nextCourseId: string | null; nextPolicyId: string | null; recommendation: string; completionPercentage: number }> {
    const progress = await this.calculateProgress(tenantId, userId, onboardingPathId);
    const path = await this.onboardingPathService.getById(tenantId, onboardingPathId);
    const nextCourseId = path.courseIds.find((courseId) => progress.remainingItems.includes(courseId)) ?? null;
    const nextPolicyId = nextCourseId ? null : path.policyIds.find((policyId) => progress.remainingItems.includes(policyId)) ?? null;

    return {
      nextCourseId,
      nextPolicyId,
      recommendation: nextCourseId
        ? `Complete course ${nextCourseId} next.`
        : nextPolicyId
          ? `Review and acknowledge policy ${nextPolicyId} next.`
          : "Onboarding path is complete.",
      completionPercentage: progress.completionPercentage
    };
  }
}
