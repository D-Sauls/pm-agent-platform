import { z } from "zod";
import type { RoleKnowledgeLookupResult } from "../../models/onboardingModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";
import { OnboardingRecommendationService } from "../onboarding/OnboardingRecommendationService.js";
import { SharePointConnector } from "../m365/SharePointConnector.js";

const metadataSchema = z.object({
  role: z.string(),
  department: z.string().optional()
});

export class RoleKnowledgeLookupWorkflow implements BaseWorkflow {
  id = "role_knowledge_lookup" as const;
  name = "Role Knowledge Lookup Workflow";
  description = "Returns role-relevant courses, policies, and documents for onboarding and knowledge guidance.";
  supportedInputTypes = ["role_knowledge", "role_policy_lookup", "onboarding_lookup"];

  constructor(
    private readonly onboardingRecommendationService: OnboardingRecommendationService,
    private readonly sharePointConnector: SharePointConnector
  ) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const metadata = metadataSchema.parse(context.metadata ?? {});
    const recommendation = await this.onboardingRecommendationService.recommend(
      context.tenantContext.tenant.tenantId,
      metadata.role,
      metadata.department
    );
    const documents = await this.sharePointConnector.listDocuments(context.tenantContext, {
      query: context.userRequest,
      role: metadata.role
    });

    const result: RoleKnowledgeLookupResult = {
      workflowId: this.id,
      resultType: this.id,
      roleName: metadata.role,
      department: metadata.department ?? null,
      courses: recommendation.recommendedCourses,
      policies: recommendation.requiredPolicies,
      documents,
      generatedAt: new Date(),
      warnings: documents.length === 0 ? ["No SharePoint documents matched the role query."] : []
    };

    return {
      workflowId: this.id,
      resultType: result.resultType,
      data: result,
      generatedAt: result.generatedAt,
      confidenceScore: 0.86,
      warnings: result.warnings
    };
  }
}
