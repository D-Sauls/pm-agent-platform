import { PromptEngine } from "../../prompt/PromptEngine.js";
import type { NormalizedProjectContext, WeeklyReportOutput } from "../models/projectModels.js";
import type { TenantContext } from "../models/tenantModels.js";
import { AppError } from "../errors/AppError.js";

interface GenerateWeeklyReportInput {
  tenantContext: TenantContext;
  projectContext: NormalizedProjectContext;
  userPrompt?: string;
}

export class ReportingEngine {
  constructor(private readonly promptEngine: PromptEngine) {}

  async generateWeeklyReport(input: GenerateWeeklyReportInput): Promise<WeeklyReportOutput> {
    try {
      const promptContext = JSON.stringify(
        {
          tenantId: input.tenantContext.tenant.tenantId,
          featureFlags: input.tenantContext.featureFlags,
          project: input.projectContext.project,
          tasks: input.projectContext.tasks,
          milestones: input.projectContext.milestones,
          statusSummary: input.projectContext.statusSummary,
          userPrompt: input.userPrompt ?? "Generate weekly report"
        },
        null,
        2
      );

      await this.promptEngine.generate(
        this.promptEngine.buildPrompt("weekly_report", "HybridPrince2Agile", promptContext)
      );

      const completed = input.projectContext.tasks.filter((task) =>
        ["done", "completed"].includes((task.status ?? "").toLowerCase())
      );
      const upcoming = input.projectContext.tasks.filter(
        (task) => !["done", "completed"].includes((task.status ?? "").toLowerCase())
      );

      return {
        projectSummary: `${input.projectContext.project.name} status: ${input.projectContext.statusSummary}`,
        achievementsThisPeriod: completed.map((task) => task.title),
        upcomingWork: upcoming.map((task) => task.title),
        risksIssues: [
          ...input.projectContext.risks.map((risk) => risk.title),
          ...input.projectContext.issues.map((issue) => issue.title)
        ],
        dependencies: input.projectContext.dependencies.map((dependency) => dependency.title),
        decisionsRequired: input.projectContext.milestones
          .filter((milestone) => (milestone.status ?? "").toLowerCase().includes("risk"))
          .map((milestone) => `Mitigation decision needed for milestone: ${milestone.title}`),
        overallRagStatus:
          input.projectContext.statusSummary === "Red"
            ? "Red"
            : input.projectContext.statusSummary === "Amber"
              ? "Amber"
              : "Green",
        assumptions: ["Reporting period aligns to configured tenant governance cadence."],
        generatedAt: new Date()
      };
    } catch (error) {
      throw new AppError("WORKFLOW_EXECUTION_FAILED", "Failed to generate weekly report", 500, error);
    }
  }
}
