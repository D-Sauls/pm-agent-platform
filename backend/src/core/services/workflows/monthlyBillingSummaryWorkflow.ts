import { z } from "zod";
import { PromptEngine } from "../../../prompt/PromptEngine.js";
import type { TimeEntry } from "../../models/timeModels.js";
import type { MonthlyBillingSummaryResult } from "../../models/timeWorkflowModels.js";
import { EffortSummaryService } from "../time/EffortSummaryService.js";
import { ResourceService } from "../time/ResourceService.js";
import { TimeEntryService } from "../time/TimeEntryService.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";

const recommendationSchema = z.object({
  recommendations: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});

function round(value: number): number {
  return Number(value.toFixed(2));
}

export class MonthlyBillingSummaryWorkflow implements BaseWorkflow {
  id = "monthly_billing_summary" as const;
  name = "Monthly Billing Summary Workflow";
  description = "Generates monthly billable/non-billable effort and utilization summary.";
  supportedInputTypes = ["text", "billing_summary_request"];

  constructor(
    private readonly timeEntryService: TimeEntryService,
    private readonly resourceService: ResourceService,
    private readonly effortSummaryService: EffortSummaryService,
    private readonly promptEngine: PromptEngine
  ) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const tenantId = context.tenantContext.tenant.tenantId;
    const requestedProjectId = context.metadata?.projectId as string | undefined;
    const projectId =
      requestedProjectId === undefined ? context.projectContext.project.projectId : requestedProjectId;

    const { startDate, endDate } = this.resolveMonthRange(context.metadata);
    const entries = await this.timeEntryService.query({ tenantId, projectId, startDate, endDate });
    const resources = await this.resourceService.listByTenant(tenantId);
    const summaryResult = this.effortSummaryService.summarize(
      { tenantId, projectId, startDate, endDate },
      entries,
      resources
    );
    const utilizationAverage = this.utilizationAverage(summaryResult.resourceSummary);
    const recommendationPayload = await this.generateRecommendations(summaryResult.summary, utilizationAverage);

    const data: MonthlyBillingSummaryResult = {
      workflowId: "monthly_billing_summary",
      resultType: "monthly_billing_summary",
      totalHours: summaryResult.summary.totalHours,
      billableHours: summaryResult.summary.billableHours,
      nonBillableHours: summaryResult.summary.nonBillableHours,
      unknownHours: summaryResult.summary.unknownHours,
      billableRatio: summaryResult.summary.billableRatio,
      utilizationAverage,
      resourceBreakdown: summaryResult.resourceSummary,
      projectBreakdown: projectId ? undefined : this.projectBreakdown(entries),
      recommendations: recommendationPayload.recommendations,
      generatedAt: new Date()
    };

    return {
      workflowId: this.id,
      resultType: "monthly_billing_summary",
      data,
      generatedAt: new Date(),
      confidenceScore: this.confidence(entries),
      warnings: recommendationPayload.warnings
    };
  }

  private resolveMonthRange(
    metadata: Record<string, unknown> | undefined
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    const month = typeof metadata?.month === "number" ? metadata.month : now.getMonth() + 1;
    const year = typeof metadata?.year === "number" ? metadata.year : now.getFullYear();
    if (month < 1 || month > 12) {
      return this.effortSummaryService.getMonthlyRange(now);
    }
    const reference = new Date(year, month - 1, 1);
    return this.effortSummaryService.getMonthlyRange(reference);
  }

  private utilizationAverage(
    resources: Array<{ utilizationPercent?: number | null }>
  ): number | undefined {
    const values = resources
      .map((resource) => resource.utilizationPercent)
      .filter((value): value is number => typeof value === "number");
    if (values.length === 0) return undefined;
    return round(values.reduce((acc, value) => acc + value, 0) / values.length);
  }

  private projectBreakdown(entries: TimeEntry[]): MonthlyBillingSummaryResult["projectBreakdown"] {
    const byProject = new Map<
      string,
      {
        totalHours: number;
        billableHours: number;
        nonBillableHours: number;
      }
    >();
    for (const entry of entries) {
      const current = byProject.get(entry.projectId) ?? {
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0
      };
      current.totalHours += entry.hours;
      if (entry.billableStatus === "billable") current.billableHours += entry.hours;
      if (entry.billableStatus === "non_billable") current.nonBillableHours += entry.hours;
      byProject.set(entry.projectId, current);
    }
    return Array.from(byProject.entries()).map(([projectId, values]) => {
      const unknownHours = Math.max(0, values.totalHours - values.billableHours - values.nonBillableHours);
      return {
        projectId,
        totalHours: round(values.totalHours),
        billableHours: round(values.billableHours),
        nonBillableHours: round(values.nonBillableHours),
        unknownHours: round(unknownHours),
        billableRatio: values.totalHours > 0 ? round(values.billableHours / values.totalHours) : 0
      };
    });
  }

  private async generateRecommendations(
    summary: {
      totalHours: number;
      billableHours: number;
      nonBillableHours: number;
      unknownHours: number;
      billableRatio: number;
    },
    utilizationAverage: number | undefined
  ): Promise<z.infer<typeof recommendationSchema>> {
    const promptContext = JSON.stringify({ summary, utilizationAverage }, null, 2);
    const raw = await this.promptEngine.generate(
      this.promptEngine.buildPrompt(
        "monthly_billing_recommendations",
        "HybridPrince2Agile",
        promptContext
      )
    );
    try {
      return recommendationSchema.parse(JSON.parse(raw));
    } catch {
      return {
        recommendations: [
          "Monitor billable ratio trend and align allocation to delivery priorities.",
          "Reduce unknown effort classifications to improve billing confidence."
        ],
        warnings: ["Recommendation parsing fallback used."]
      };
    }
  }

  private confidence(entries: TimeEntry[]): number {
    if (entries.length === 0) return 0.4;
    const known = entries.filter((entry) => entry.billableStatus !== "unknown").length;
    return round(Math.min(0.95, 0.55 + known / (entries.length * 2)));
  }
}
