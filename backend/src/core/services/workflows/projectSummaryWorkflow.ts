import { z } from "zod";
import { PromptEngine } from "../../../prompt/PromptEngine.js";
import type { ProjectSummaryResult } from "../../models/projectSummaryModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";

const inputSchema = z.object({
  userRequest: z.string().optional()
});
const outputSchema = z.object({
  projectOverview: z.string(),
  deliveryHealth: z.enum(["green", "amber", "red", "unknown"]),
  progressSummary: z.string(),
  keyAchievements: z.array(z.string()).default([]),
  risksIssues: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  upcomingMilestones: z.array(z.string()).default([]),
  recommendedFocus: z.array(z.string()).default([]),
  assumptionsMade: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});

export class ProjectSummaryWorkflow implements BaseWorkflow {
  id = "project_summary" as const;
  name = "Project Summary Workflow";
  description = "Builds concise executive-level project summary from normalized context.";
  supportedInputTypes = ["text", "summary_request", "status_request"];

  constructor(private readonly promptEngine: PromptEngine) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    inputSchema.parse({ userRequest: context.userRequest });

    const promptContext = JSON.stringify(
      {
        message: context.userRequest ?? "Summarize this project",
        contextType: (context.metadata?.contextType as string | undefined) ?? "project_summary",
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
      this.promptEngine.buildPrompt("project_summary", mode, promptContext)
    );
    const parsed = this.parse(raw, context);

    const result: ProjectSummaryResult = {
      workflowId: this.id,
      resultType: "project_summary",
      projectOverview: parsed.projectOverview,
      deliveryHealth: parsed.deliveryHealth,
      progressSummary: parsed.progressSummary,
      keyAchievements: parsed.keyAchievements,
      risksIssues: parsed.risksIssues,
      blockers: parsed.blockers,
      upcomingMilestones: parsed.upcomingMilestones,
      recommendedFocus: parsed.recommendedFocus,
      assumptionsMade:
        parsed.assumptionsMade.length > 0
          ? parsed.assumptionsMade
          : ["Project context is assumed to reflect the latest reporting cycle."],
      warnings: parsed.warnings,
      generatedAt: new Date()
    };

    return {
      workflowId: this.id,
      resultType: "project_summary",
      data: result,
      generatedAt: new Date(),
      confidenceScore: this.estimateConfidence(result),
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
    const project = context.projectContext.project;
    return {
      projectOverview: `${project.name} is currently ${context.projectContext.statusSummary}.`,
      deliveryHealth: this.mapHealth(context.projectContext.statusSummary),
      progressSummary: "Summary generated from normalized context fallback due to model parse failure.",
      keyAchievements: context.projectContext.tasks.slice(0, 3).map((task) => task.title),
      risksIssues: [
        ...context.projectContext.risks.map((risk) => risk.title),
        ...context.projectContext.issues.map((issue) => issue.title)
      ],
      blockers: context.projectContext.issues.slice(0, 3).map((issue) => issue.title),
      upcomingMilestones: context.projectContext.milestones.slice(0, 5).map((milestone) => milestone.title),
      recommendedFocus: [
        "Review top risks and active blockers with owners.",
        "Confirm upcoming milestone readiness and unresolved dependencies."
      ],
      assumptionsMade: ["Fallback summary used due to invalid model output JSON."],
      warnings: ["Model output parsing failed; fallback project summary used."]
    };
  }

  private mapHealth(statusSummary: string): "green" | "amber" | "red" | "unknown" {
    const text = statusSummary.toLowerCase();
    if (text.includes("green") || text.includes("on track")) return "green";
    if (text.includes("amber") || text.includes("at risk")) return "amber";
    if (text.includes("red") || text.includes("off track")) return "red";
    return "unknown";
  }

  private toPromptDeliveryMode(mode: "waterfall" | "agile" | "hybrid"): "Waterfall" | "AgileLean" | "HybridPrince2Agile" {
    if (mode === "waterfall") return "Waterfall";
    if (mode === "agile") return "AgileLean";
    return "HybridPrince2Agile";
  }

  private estimateConfidence(result: ProjectSummaryResult): number {
    const signalCount = [
      result.keyAchievements.length,
      result.risksIssues.length,
      result.blockers.length,
      result.upcomingMilestones.length,
      result.recommendedFocus.length
    ].reduce((acc, value) => acc + (value > 0 ? 1 : 0), 0);
    return Number((0.6 + signalCount * 0.07).toFixed(2));
  }
}
