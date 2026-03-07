import { z } from "zod";
import { PromptEngine } from "../../../prompt/PromptEngine.js";
import type { DeliveryAdvisorResult, DeliveryPriority } from "../../models/deliveryAdvisorModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";

const inputSchema = z.object({
  userRequest: z.string().optional()
});
const prioritySchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.enum(["risk", "blocker", "governance", "delivery", "dependency"]),
  urgency: z.enum(["low", "medium", "high"]),
  recommendedAction: z.string(),
  confidence: z.number().optional()
});
const outputSchema = z.object({
  priorities: z.array(prioritySchema).default([]),
  risks: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  governanceReminders: z.array(z.string()).default([]),
  upcomingMilestones: z.array(z.string()).default([]),
  assumptionsMade: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});

export class DeliveryAdvisorWorkflow implements BaseWorkflow {
  id = "delivery_advisor" as const;
  name = "Delivery Advisor Workflow";
  description = "Suggests next best PM actions based on current project context.";
  supportedInputTypes = ["text", "question"];

  constructor(private readonly promptEngine: PromptEngine) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    inputSchema.parse({ userRequest: context.userRequest });
    const promptContext = JSON.stringify(
      {
        message: context.userRequest ?? "What should I focus on next?",
        contextType: (context.metadata?.contextType as string | undefined) ?? "delivery_advice",
        project: context.projectContext.project,
        tasks: context.projectContext.tasks,
        milestones: context.projectContext.milestones,
        risks: context.projectContext.risks,
        issues: context.projectContext.issues,
        dependencies: context.projectContext.dependencies,
        statusSummary: context.projectContext.statusSummary
      },
      null,
      2
    );
    const mode = this.toPromptDeliveryMode(context.projectContext.project.deliveryMode);
    const raw = await this.promptEngine.generate(
      this.promptEngine.buildPrompt("delivery_advisor", mode, promptContext)
    );
    const parsed = this.parse(raw, context);

    const result: DeliveryAdvisorResult = {
      workflowId: this.id,
      resultType: "delivery_advisor",
      priorities: parsed.priorities,
      risks: parsed.risks,
      blockers: parsed.blockers,
      governanceReminders: parsed.governanceReminders,
      upcomingMilestones: parsed.upcomingMilestones,
      assumptionsMade:
        parsed.assumptionsMade.length > 0
          ? parsed.assumptionsMade
          : ["Current status data is assumed to be up to date for this cycle."],
      warnings: parsed.warnings,
      generatedAt: new Date()
    };

    return {
      workflowId: this.id,
      resultType: "delivery_advisor",
      data: result,
      generatedAt: new Date(),
      confidenceScore: this.averageConfidence(result.priorities),
      warnings: result.warnings
    };
  }

  private parse(raw: string, context: AgentExecutionContext): z.infer<typeof outputSchema> {
    try {
      return outputSchema.parse(JSON.parse(raw));
    } catch {
      return this.fallback(context);
    }
  }

  private fallback(context: AgentExecutionContext): z.infer<typeof outputSchema> {
    const upcomingMilestones = context.projectContext.milestones.map((m) => m.title);
    const blockers = context.projectContext.issues.map((i) => i.title);
    const risks = context.projectContext.risks.map((r) => r.title);
    const priorities: DeliveryPriority[] = [
      {
        title: "Review highest delivery risk",
        description: "Prioritize immediate mitigation for top risk or issue.",
        category: "risk",
        urgency: "high",
        recommendedAction: "Assign owner and mitigation date.",
        confidence: 0.62
      }
    ];
    return {
      priorities,
      risks,
      blockers,
      governanceReminders: ["Review governance controls and upcoming approvals."],
      upcomingMilestones,
      assumptionsMade: ["Fallback advisory generated due to model output parse failure."],
      warnings: ["Model output parsing failed; fallback delivery advisory used."]
    };
  }

  private toPromptDeliveryMode(mode: "waterfall" | "agile" | "hybrid"): "Waterfall" | "AgileLean" | "HybridPrince2Agile" {
    if (mode === "waterfall") return "Waterfall";
    if (mode === "agile") return "AgileLean";
    return "HybridPrince2Agile";
  }

  private averageConfidence(priorities: DeliveryPriority[]): number {
    if (priorities.length === 0) return 0.55;
    const sum = priorities.reduce((acc, p) => acc + (p.confidence ?? 0.7), 0);
    return Number((sum / priorities.length).toFixed(2));
  }
}
