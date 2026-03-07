import { z } from "zod";
import { PromptEngine } from "../../../prompt/PromptEngine.js";
import type { ChangeAssessmentResult, ChangeImpactAssessment } from "../../models/changeAssessmentModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";

const inputSchema = z.object({
  userRequest: z.string().min(1)
});

const impactSchema = z.object({
  scopeClassification: z.enum(["in_scope", "out_of_scope", "requires_review"]),
  scheduleImpact: z.enum(["low", "medium", "high", "unknown"]),
  effortImpact: z.enum(["low", "medium", "high", "unknown"]),
  costImpact: z.enum(["low", "medium", "high", "unknown"]),
  deliveryRisk: z.enum(["low", "medium", "high", "unknown"]),
  dependencyImpact: z.array(z.string()).default([]),
  governanceImpact: z.array(z.string()).default([]),
  assumptionsMade: z.array(z.string()).default([]),
  decisionRequired: z.string().nullable(),
  recommendedNextStep: z.string().nullable(),
  confidence: z.number().nullable().optional()
});
const outputSchema = z.object({
  changeSummary: z.string(),
  impactAssessment: impactSchema,
  warnings: z.array(z.string()).default([])
});

export class ChangeAssessmentWorkflow implements BaseWorkflow {
  id = "change_assessment" as const;
  name = "Change Assessment Workflow";
  description = "Evaluates impact of a change request on project delivery.";
  supportedInputTypes = ["text", "change_request"];

  constructor(private readonly promptEngine: PromptEngine) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    inputSchema.parse({ userRequest: context.userRequest });

    const mode = this.toPromptDeliveryMode(context.projectContext.project.deliveryMode);
    const promptContext = JSON.stringify(
      {
        changeText: context.userRequest,
        sourceType: (context.metadata?.sourceType as string | undefined) ?? "generic",
        requestedBy: (context.metadata?.requestedBy as string | null | undefined) ?? null,
        tenantId: context.tenantContext.tenant.tenantId,
        project: context.projectContext.project,
        statusSummary: context.projectContext.statusSummary,
        dependencies: context.projectContext.dependencies
      },
      null,
      2
    );
    const raw = await this.promptEngine.generate(
      this.promptEngine.buildPrompt("change_assessment", mode, promptContext)
    );
    const parsed = this.parse(raw, context.userRequest, context.projectContext.project.deliveryMode);

    const result: ChangeAssessmentResult = {
      workflowId: this.id,
      resultType: "change_assessment",
      changeSummary: parsed.changeSummary,
      impactAssessment: parsed.impactAssessment,
      warnings: parsed.warnings,
      generatedAt: new Date()
    };

    return {
      workflowId: this.id,
      resultType: "change_assessment",
      data: result,
      generatedAt: new Date(),
      confidenceScore: result.impactAssessment.confidence ?? 0.75,
      warnings: result.warnings
    };
  }

  private parse(
    raw: string,
    changeText: string,
    deliveryMode: "waterfall" | "agile" | "hybrid"
  ): z.infer<typeof outputSchema> {
    try {
      return outputSchema.parse(JSON.parse(raw));
    } catch {
      return {
        changeSummary: changeText.slice(0, 180),
        impactAssessment: this.fallbackImpact(deliveryMode),
        warnings: ["Model output parsing failed; fallback change assessment used."]
      };
    }
  }

  private fallbackImpact(deliveryMode: "waterfall" | "agile" | "hybrid"): ChangeImpactAssessment {
    const governanceImpact =
      deliveryMode === "waterfall"
        ? ["Formal change control approval and baseline update required."]
        : deliveryMode === "agile"
          ? ["Backlog reprioritization and sprint scope trade-off required."]
          : ["Governance board review plus incremental delivery plan required."];

    return {
      scopeClassification: "requires_review",
      scheduleImpact: "medium",
      effortImpact: "medium",
      costImpact: "unknown",
      deliveryRisk: "medium",
      dependencyImpact: [],
      governanceImpact,
      assumptionsMade: ["Detailed impact data not fully available at assessment time."],
      decisionRequired: "Approve full impact analysis and change control action?",
      recommendedNextStep: "Conduct cross-functional impact review.",
      confidence: 0.6
    };
  }

  private toPromptDeliveryMode(mode: "waterfall" | "agile" | "hybrid"): "Waterfall" | "AgileLean" | "HybridPrince2Agile" {
    if (mode === "waterfall") {
      return "Waterfall";
    }
    if (mode === "agile") {
      return "AgileLean";
    }
    return "HybridPrince2Agile";
  }
}
