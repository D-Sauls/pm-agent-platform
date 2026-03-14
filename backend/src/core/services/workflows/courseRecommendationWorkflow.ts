import { z } from "zod";
import type { CourseRecommendationResult } from "../../models/knowledgeModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";
import { RecommendationService } from "../knowledge/RecommendationService.js";

const metadataSchema = z.object({
  role: z.string().min(1),
  department: z.string().optional()
});

export class CourseRecommendationWorkflow implements BaseWorkflow {
  id = "course_recommendation" as const;
  name = "Course Recommendation Workflow";
  description = "Recommends tenant-scoped courses and policies for a role or onboarding path.";
  supportedInputTypes = ["role_request", "learning_request", "onboarding_request"];

  constructor(private readonly recommendationService: RecommendationService) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const metadata = metadataSchema.parse(context.metadata ?? {});
    const recommendations = this.recommendationService.recommendForRole(
      context.tenantContext.tenant.tenantId,
      metadata.role,
      metadata.department
    );

    const result: CourseRecommendationResult = {
      workflowId: this.id,
      resultType: "course_recommendation",
      userRole: metadata.role,
      recommendedCourses: recommendations.recommendedCourses,
      requiredPolicies: recommendations.requiredPolicies,
      onboardingPath: recommendations.onboardingPath,
      generatedAt: new Date(),
      warnings: recommendations.recommendedCourses.length === 0 ? ["No published courses matched the requested role."] : []
    };

    return {
      workflowId: this.id,
      resultType: result.resultType,
      data: result,
      generatedAt: result.generatedAt,
      confidenceScore: recommendations.recommendedCourses.length > 0 ? 0.9 : 0.62,
      warnings: result.warnings
    };
  }
}
