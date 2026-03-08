import { z } from "zod";
import { PromptEngine } from "../../../prompt/PromptEngine.js";
import type { ForecastInput, TimeEntry } from "../../models/forecastModels.js";
import type { ForecastWorkflowResult } from "../../models/forecastWorkflowModels.js";
import { ForecastService } from "../ForecastService.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";

const inputSchema = z.object({
  userRequest: z.string().optional()
});

const explanationSchema = z.object({
  forecastExplanation: z.string(),
  recommendedActions: z.array(z.string()).default([]),
  assumptionsMade: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});

type ForecastType = "delivery" | "capacity" | "billing" | "full";

export class ForecastWorkflow implements BaseWorkflow {
  id = "forecast" as const;
  name = "Forecast Workflow";
  description = "Runs deterministic delivery/capacity/billing forecast and explains output.";
  supportedInputTypes = ["text", "forecast_request"];

  constructor(
    private readonly forecastService: ForecastService,
    private readonly promptEngine: PromptEngine
  ) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    inputSchema.parse({ userRequest: context.userRequest });
    const forecastType = ((context.metadata?.forecastType as ForecastType | undefined) ?? "full");
    const forecastInput = this.toForecastInput(context);
    const deterministic = await this.forecastService.generateForecast(forecastInput);

    const explanationPromptContext = JSON.stringify(
      {
        forecastType,
        userRequest: context.userRequest ?? "Forecast project status",
        deliveryForecast: deterministic.deliveryForecast,
        capacityForecast: deterministic.capacityForecast,
        billingForecast: deterministic.billingForecast
      },
      null,
      2
    );
    const raw = await this.promptEngine.generate(
      this.promptEngine.buildPrompt(
        "forecast_explanation",
        this.toPromptDeliveryMode(context.projectContext.project.deliveryMode),
        explanationPromptContext
      )
    );
    const explanation = this.parseExplanation(raw);

    const result: ForecastWorkflowResult = {
      workflowId: "forecast",
      resultType: "forecast",
      deliveryForecast: deterministic.deliveryForecast,
      capacityForecast: deterministic.capacityForecast,
      billingForecast: deterministic.billingForecast,
      forecastExplanation: explanation.forecastExplanation,
      recommendedActions: this.filterActions(explanation.recommendedActions, forecastType),
      assumptionsMade: explanation.assumptionsMade,
      warnings: explanation.warnings,
      generatedAt: new Date()
    };

    return {
      workflowId: this.id,
      resultType: "forecast",
      data: result,
      generatedAt: new Date(),
      confidenceScore: deterministic.confidenceScore,
      warnings: result.warnings
    };
  }

  private toForecastInput(context: AgentExecutionContext): ForecastInput {
    const project = context.projectContext.project;
    const timeEntries = (context.metadata?.timeEntries as TimeEntry[] | undefined) ?? [];
    return {
      tenantId: context.tenantContext.tenant.tenantId,
      projectId: project.projectId,
      tasks: context.projectContext.tasks,
      milestones: context.projectContext.milestones,
      risks: context.projectContext.risks,
      issues: context.projectContext.issues,
      dependencies: context.projectContext.dependencies,
      timeEntries,
      projectStartDate: project.startDate ?? undefined,
      projectEndDate: project.endDate ?? undefined,
      metadata: context.metadata
    };
  }

  private parseExplanation(raw: string): z.infer<typeof explanationSchema> {
    try {
      return explanationSchema.parse(JSON.parse(raw));
    } catch {
      return {
        forecastExplanation:
          "Deterministic forecast generated successfully; explanation fallback was used due to parse failure.",
        recommendedActions: [
          "Review top delivery risks and blockers with owners.",
          "Validate workload balance and near-term billable effort trends."
        ],
        assumptionsMade: ["Explanation fallback used; deterministic forecast values remain accurate."],
        warnings: ["Model output parsing failed; fallback explanation used."]
      };
    }
  }

  private filterActions(actions: string[], forecastType: ForecastType): string[] {
    if (forecastType === "full") return actions;
    const keywords =
      forecastType === "delivery"
        ? ["delivery", "risk", "blocker", "milestone", "slip"]
        : forecastType === "capacity"
          ? ["capacity", "workload", "allocation", "utilization", "overload"]
          : ["billable", "hours", "effort", "billing", "utilization"];
    const filtered = actions.filter((action) =>
      keywords.some((keyword) => action.toLowerCase().includes(keyword))
    );
    return filtered.length > 0 ? filtered : actions.slice(0, 2);
  }

  private toPromptDeliveryMode(mode: "waterfall" | "agile" | "hybrid"): "Waterfall" | "AgileLean" | "HybridPrince2Agile" {
    if (mode === "waterfall") return "Waterfall";
    if (mode === "agile") return "AgileLean";
    return "HybridPrince2Agile";
  }
}
