import { z } from "zod";
import type { NextTrainingStepResult } from "../../models/onboardingModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";
import { OnboardingProgressService } from "../onboarding/OnboardingProgressService.js";
import { OnboardingRecommendationService } from "../onboarding/OnboardingRecommendationService.js";

const metadataSchema = z.object({
  userId: z.string(),
  role: z.string(),
  department: z.string().optional()
});

export class NextTrainingStepWorkflow implements BaseWorkflow {
  id = "next_training_step" as const;
  name = "Next Training Step Workflow";
  description = "Determines the next recommended onboarding item for a user.";
  supportedInputTypes = ["next_step", "onboarding_progress", "training_next_action"];

  constructor(
    private readonly onboardingRecommendationService: OnboardingRecommendationService,
    private readonly onboardingProgressService: OnboardingProgressService
  ) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const metadata = metadataSchema.parse(context.metadata ?? {});
    const recommendation = await this.onboardingRecommendationService.recommend(
      context.tenantContext.tenant.tenantId,
      metadata.role,
      metadata.department
    );

    const next = recommendation.onboardingPath
      ? await this.onboardingProgressService.recommendNext(
          context.tenantContext.tenant.tenantId,
          metadata.userId,
          recommendation.onboardingPath.id
        )
      : {
          nextCourseId: recommendation.recommendedCourses[0]?.id ?? null,
          nextPolicyId: recommendation.requiredPolicies[0]?.id ?? null,
          recommendation: recommendation.nextActions[0] ?? "No next action available.",
          completionPercentage: 0
        };

    const result: NextTrainingStepResult = {
      workflowId: this.id,
      resultType: this.id,
      userId: metadata.userId,
      onboardingPathId: recommendation.onboardingPath?.id ?? null,
      nextCourseId: next.nextCourseId,
      nextPolicyId: next.nextPolicyId,
      recommendation: next.recommendation,
      completionPercentage: next.completionPercentage,
      generatedAt: new Date(),
      warnings: recommendation.onboardingPath ? [] : ["No explicit onboarding path found; using recommendation fallback."]
    };

    return {
      workflowId: this.id,
      resultType: result.resultType,
      data: result,
      generatedAt: result.generatedAt,
      confidenceScore: recommendation.onboardingPath ? 0.9 : 0.7,
      warnings: result.warnings
    };
  }
}
