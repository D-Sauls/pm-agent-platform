import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";

export class ChangeAssessmentWorkflow implements BaseWorkflow {
  id = "change_assessment" as const;
  name = "Change Assessment Workflow";
  description = "Evaluates impact of a change request on project delivery.";
  supportedInputTypes = ["text", "change_request"];

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const highLoad = context.projectContext.tasks.filter((t) => (t.status ?? "") !== "Done").length > 3;
    const recommendation = highLoad
      ? "Defer until current milestone risk is mitigated."
      : "Proceed with controlled scope update.";

    return {
      workflowId: this.id,
      resultType: "assessment",
      data: {
        summary: "Change request assessment generated",
        recommendation,
        dependencies: context.projectContext.dependencies.map((dep) => dep.title)
      },
      generatedAt: new Date(),
      confidenceScore: 0.8,
      warnings: highLoad ? ["High active task load may affect delivery confidence."] : []
    };
  }
}
