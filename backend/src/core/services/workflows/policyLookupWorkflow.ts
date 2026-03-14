import { z } from "zod";
import type { PolicyLookupResult } from "../../models/knowledgeModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";
import { PolicyService } from "../knowledge/PolicyService.js";

const metadataSchema = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  role: z.string().optional()
});

export class PolicyLookupWorkflow implements BaseWorkflow {
  id = "policy_lookup" as const;
  name = "Policy Lookup Workflow";
  description = "Finds policies by tenant, query, role, category, or tag.";
  supportedInputTypes = ["policy_lookup", "knowledge_lookup", "compliance_request"];

  constructor(private readonly policyService: PolicyService) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const metadata = metadataSchema.parse(context.metadata ?? {});
    const matches = this.policyService.lookupPolicies(context.tenantContext.tenant.tenantId, {
      query: context.userRequest,
      category: metadata.category,
      tag: metadata.tag,
      role: metadata.role
    });

    const result: PolicyLookupResult = {
      workflowId: this.id,
      resultType: "policy_lookup",
      query: context.userRequest,
      matches,
      generatedAt: new Date(),
      warnings: matches.length === 0 ? ["No matching policies were found."] : []
    };

    return {
      workflowId: this.id,
      resultType: result.resultType,
      data: result,
      generatedAt: result.generatedAt,
      confidenceScore: matches.length > 0 ? 0.88 : 0.58,
      warnings: result.warnings
    };
  }
}
