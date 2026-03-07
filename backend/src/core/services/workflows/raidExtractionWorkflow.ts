import { z } from "zod";
import { PromptEngine } from "../../../prompt/PromptEngine.js";
import type { RaidExtractionResult, RaidItem } from "../../models/raidModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";

const raidItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  impact: z.string().nullable().optional(),
  ownerSuggestion: z.string().nullable().optional(),
  dueDateSuggestion: z.string().nullable().optional(),
  responseRecommendation: z.string().nullable().optional(),
  confidence: z.number().nullable().optional()
});
const workflowInputSchema = z.object({
  userRequest: z.string().min(1)
});

const raidOutputSchema = z.object({
  risks: z.array(raidItemSchema).default([]),
  issues: z.array(raidItemSchema).default([]),
  assumptions: z.array(raidItemSchema).default([]),
  dependencies: z.array(raidItemSchema).default([]),
  assumptionsMade: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});

export class RaidExtractionWorkflow implements BaseWorkflow {
  id = "raid_extraction" as const;
  name = "RAID Extraction Workflow";
  description = "Extracts risks, issues, assumptions, and dependencies from request/context.";
  supportedInputTypes = ["text", "notes"];

  constructor(private readonly promptEngine: PromptEngine) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    workflowInputSchema.parse({ userRequest: context.userRequest });
    const promptContext = JSON.stringify(
      {
        notesText: context.userRequest,
        tenantId: context.tenantContext.tenant.tenantId,
        projectId: context.projectContext.project.projectId,
        sourceType: (context.metadata?.sourceType as string | undefined) ?? "generic"
      },
      null,
      2
    );
    const modelOutput = await this.promptEngine.generate(
      this.promptEngine.buildPrompt("raid_extraction", "HybridPrince2Agile", promptContext)
    );

    const parsed = this.parseModelOutput(modelOutput, context.userRequest);

    const result: RaidExtractionResult = {
      workflowId: this.id,
      resultType: "raid_extraction",
      risks: this.withType(parsed.risks, "risk"),
      issues: this.withType(parsed.issues, "issue"),
      assumptions: this.withType(parsed.assumptions, "assumption"),
      dependencies: this.withType(parsed.dependencies, "dependency"),
      assumptionsMade:
        parsed.assumptionsMade.length > 0
          ? parsed.assumptionsMade
          : ["No explicit assumptions were provided in source notes; inferred minimally."],
      warnings: parsed.warnings,
      generatedAt: new Date()
    };

    return {
      workflowId: this.id,
      resultType: "raid_extraction",
      data: result,
      generatedAt: new Date(),
      confidenceScore: this.calculateConfidence(result),
      warnings: result.warnings
    };
  }

  private parseModelOutput(raw: string, fallbackNotes: string) {
    try {
      const candidate = JSON.parse(raw);
      return raidOutputSchema.parse(candidate);
    } catch {
      return {
        risks: this.keywordFallback(fallbackNotes, "risk"),
        issues: this.keywordFallback(fallbackNotes, "issue"),
        assumptions: this.keywordFallback(fallbackNotes, "assumption"),
        dependencies: this.keywordFallback(fallbackNotes, "dependency"),
        assumptionsMade: ["Output used keyword fallback because model output was not valid JSON."],
        warnings: ["Model output parsing failed; fallback extraction applied."]
      };
    }
  }

  private keywordFallback(notes: string, keyword: string): Array<z.infer<typeof raidItemSchema>> {
    const lines = notes
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const matched = lines.filter((line) => line.toLowerCase().includes(keyword));
    return matched.map((line) => ({
      title: line.slice(0, 80),
      description: line,
      impact: null,
      ownerSuggestion: null,
      dueDateSuggestion: null,
      responseRecommendation: null,
      confidence: 0.55
    }));
  }

  private withType(items: Array<z.infer<typeof raidItemSchema>>, type: RaidItem["type"]): RaidItem[] {
    return items.map((item) => ({ type, ...item }));
  }

  private calculateConfidence(result: RaidExtractionResult): number {
    const items = [
      ...result.risks,
      ...result.issues,
      ...result.assumptions,
      ...result.dependencies
    ];
    if (items.length === 0) {
      return 0.45;
    }
    const explicit = items.filter((item) => (item.confidence ?? 0) >= 0.8).length;
    return Number((0.55 + explicit / (2 * items.length)).toFixed(2));
  }
}
