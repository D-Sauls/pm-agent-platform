import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";

export class ProjectSummaryWorkflow implements BaseWorkflow {
  id = "project_summary" as const;
  name = "Project Summary Workflow";
  description = "Builds concise project summary from normalized context.";
  supportedInputTypes = ["text", "summary_request"];

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    return {
      workflowId: this.id,
      resultType: "summary",
      data: {
        summary: `${context.projectContext.project.name}: ${context.projectContext.statusSummary}`,
        dependencies: context.projectContext.dependencies.map((d) => d.title)
      },
      generatedAt: new Date(),
      confidenceScore: 0.9,
      warnings: []
    };
  }
}
