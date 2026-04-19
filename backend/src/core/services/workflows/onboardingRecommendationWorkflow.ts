import { z } from "zod";
import type { OnboardingRecommendationResult } from "../../models/onboardingModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";
import { OnboardingRecommendationService } from "../onboarding/OnboardingRecommendationService.js";

const metadataSchema = z.object({
  role: z.string().optional(),
  department: z.string().optional()
});

export class OnboardingRecommendationWorkflow implements BaseWorkflow {
  id = "onboarding_recommendation" as const;
  name = "Onboarding Recommendation Workflow";
  description = "Builds a role-aware onboarding path and recommends initial training and policy steps.";
  supportedInputTypes = ["onboarding", "role_recommendation", "training_path"];

  constructor(private readonly onboardingRecommendationService: OnboardingRecommendationService) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const metadata = metadataSchema.parse(context.metadata ?? {});
    const recommendation = await this.onboardingRecommendationService.recommend(
      context.tenantContext.tenant.tenantId,
      metadata.role ?? context.userRequest,
      metadata.department
    );

    const result: OnboardingRecommendationResult = {
      workflowId: this.id,
      resultType: this.id,
      roleProfile: recommendation.roleProfile,
      onboardingPath: recommendation.onboardingPath,
      recommendedCourses: recommendation.recommendedCourses,
      requiredPolicies: recommendation.requiredPolicies,
      nextActions: recommendation.nextActions,
      generatedAt: new Date(),
      warnings: recommendation.recommendedCourses.length === 0 ? ["No onboarding courses matched the supplied role."] : []
    };

    return {
      workflowId: this.id,
      resultType: result.resultType,
      data: result,
      generatedAt: result.generatedAt,
      confidenceScore: recommendation.onboardingPath ? 0.91 : 0.74,
      warnings: result.warnings
    };
  }
}
