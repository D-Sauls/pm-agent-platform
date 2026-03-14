import { z } from "zod";
import { PromptEngine } from "../../../prompt/PromptEngine.js";
import type { KnowledgeExplainResult } from "../../models/knowledgeModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";
import { KnowledgeIndexService } from "../knowledge/KnowledgeIndexService.js";

const metadataSchema = z.object({
  role: z.string().optional()
});

const outputSchema = z.object({
  explanation: z.string(),
  assumptionsMade: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});

export class KnowledgeExplainWorkflow implements BaseWorkflow {
  id = "knowledge_explain" as const;
  name = "Knowledge Explain Workflow";
  description = "Explains indexed tenant knowledge using structured metadata and bounded LLM synthesis.";
  supportedInputTypes = ["knowledge_question", "policy_explain", "lesson_explain"];

  constructor(
    private readonly knowledgeIndexService: KnowledgeIndexService,
    private readonly promptEngine: PromptEngine
  ) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const metadata = metadataSchema.parse(context.metadata ?? {});
    const matchedItems = this.knowledgeIndexService.search(
      context.tenantContext.tenant.tenantId,
      context.userRequest,
      metadata.role
    );

    const promptContext = JSON.stringify(
      {
        query: context.userRequest,
        role: metadata.role,
        matchedItems
      },
      null,
      2
    );
    const raw = await this.promptEngine.generate(
      this.promptEngine.buildPrompt("knowledge_explain", "HybridPrince2Agile", promptContext)
    );

    const parsed = this.parse(raw, matchedItems);
    const result: KnowledgeExplainResult = {
      workflowId: this.id,
      resultType: "knowledge_explain",
      query: context.userRequest,
      matchedItems,
      explanation: parsed.explanation,
      assumptionsMade:
        parsed.assumptionsMade.length > 0
          ? parsed.assumptionsMade
          : ["Explanation is derived from indexed metadata rather than full source documents."],
      generatedAt: new Date(),
      warnings: [...parsed.warnings, ...(matchedItems.length === 0 ? ["No indexed knowledge matched the query."] : [])]
    };

    return {
      workflowId: this.id,
      resultType: result.resultType,
      data: result,
      generatedAt: result.generatedAt,
      confidenceScore: matchedItems.length > 0 ? 0.82 : 0.57,
      warnings: result.warnings
    };
  }

  private parse(raw: string, matchedItems: KnowledgeExplainResult["matchedItems"]): z.infer<typeof outputSchema> {
    try {
      return outputSchema.parse(JSON.parse(raw));
    } catch {
      return {
        explanation:
          matchedItems.length > 0
            ? `Matched ${matchedItems.length} knowledge item(s). Review the most relevant course and policy entries first.`
            : "No indexed knowledge items matched the query.",
        assumptionsMade: ["Fallback explanation used because model output could not be parsed."],
        warnings: ["Model output parsing failed; fallback explanation used."]
      };
    }
  }
}
