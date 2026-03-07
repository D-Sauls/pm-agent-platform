import { ReportingEngine } from "../../services/ReportingEngine.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";

export class WeeklyReportWorkflowV2 implements BaseWorkflow {
  id = "weekly_report" as const;
  name = "Weekly Report Workflow";
  description = "Generates a weekly project highlight report.";
  supportedInputTypes = ["text", "chat"];

  constructor(private readonly reportingEngine: ReportingEngine) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const report = await this.reportingEngine.generateWeeklyReport({
      tenantContext: context.tenantContext,
      projectContext: context.projectContext,
      userPrompt: context.userRequest
    });

    return {
      workflowId: this.id,
      resultType: "report",
      data: report,
      generatedAt: new Date(),
      confidenceScore: 0.95,
      warnings: []
    };
  }
}
