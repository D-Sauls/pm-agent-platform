import { z } from "zod";
import { PromptEngine } from "../../../prompt/PromptEngine.js";
import type { TimeEntry } from "../../models/timeModels.js";
import type { WeeklyTimeReportResult } from "../../models/timeWorkflowModels.js";
import { EffortSummaryService } from "../time/EffortSummaryService.js";
import { ResourceService } from "../time/ResourceService.js";
import { TimeEntryService } from "../time/TimeEntryService.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";

const recommendationSchema = z.object({
  recommendations: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});

export class WeeklyTimeReportWorkflow implements BaseWorkflow {
  id = "weekly_time_report" as const;
  name = "Weekly Time Report Workflow";
  description = "Generates weekly billable and utilization time summaries.";
  supportedInputTypes = ["text", "time_report_request"];

  constructor(
    private readonly timeEntryService: TimeEntryService,
    private readonly resourceService: ResourceService,
    private readonly effortSummaryService: EffortSummaryService,
    private readonly promptEngine: PromptEngine
  ) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const tenantId = context.tenantContext.tenant.tenantId;
    const projectId = (context.metadata?.projectId as string | undefined) ?? context.projectContext.project.projectId;
    const startDate = this.toDate(context.metadata?.startDate) ?? this.effortSummaryService.getWeeklyRange(new Date()).startDate;
    const endDate = this.toDate(context.metadata?.endDate) ?? this.effortSummaryService.getWeeklyRange(new Date()).endDate;

    const entries = await this.timeEntryService.query({ tenantId, projectId, startDate, endDate });
    const resources = await this.resourceService.listByTenant(tenantId);
    const result = this.effortSummaryService.summarize(
      { tenantId, projectId, startDate, endDate },
      entries,
      resources
    );
    const recommendationPayload = await this.generateRecommendations(result.summary, result.resourceSummary);

    const data: WeeklyTimeReportResult = {
      workflowId: "weekly_time_report",
      resultType: "weekly_time_report",
      totalHours: result.summary.totalHours,
      billableHours: result.summary.billableHours,
      nonBillableHours: result.summary.nonBillableHours,
      unknownHours: result.summary.unknownHours,
      billableRatio: result.summary.billableRatio,
      resourceBreakdown: result.resourceSummary,
      taskBreakdown: result.taskSummary,
      recommendations: recommendationPayload.recommendations,
      generatedAt: new Date()
    };

    return {
      workflowId: this.id,
      resultType: "weekly_time_report",
      data,
      generatedAt: new Date(),
      confidenceScore: this.confidence(entries),
      warnings: recommendationPayload.warnings
    };
  }

  private async generateRecommendations(
    summary: {
      totalHours: number;
      billableHours: number;
      nonBillableHours: number;
      unknownHours: number;
      billableRatio: number;
    },
    resourceBreakdown: Array<{ userId: string; utilizationPercent?: number | null }>
  ): Promise<z.infer<typeof recommendationSchema>> {
    const promptContext = JSON.stringify({ summary, resourceBreakdown }, null, 2);
    const raw = await this.promptEngine.generate(
      this.promptEngine.buildPrompt("weekly_time_recommendations", "HybridPrince2Agile", promptContext)
    );
    try {
      return recommendationSchema.parse(JSON.parse(raw));
    } catch {
      return {
        recommendations: [
          "Review non-billable effort drivers and reduce avoidable overhead.",
          "Address unknown classifications to improve reporting quality."
        ],
        warnings: ["Recommendation parsing fallback used."]
      };
    }
  }

  private confidence(entries: TimeEntry[]): number {
    if (entries.length === 0) return 0.45;
    const classified = entries.filter((entry) => entry.billableStatus !== "unknown").length;
    return Number((0.55 + classified / (entries.length * 2)).toFixed(2));
  }

  private toDate(input: unknown): Date | undefined {
    if (!input) return undefined;
    const date = input instanceof Date ? input : new Date(String(input));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
}
