import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";

export class DeliveryAdvisorWorkflow implements BaseWorkflow {
  id = "delivery_advisor" as const;
  name = "Delivery Advisor Workflow";
  description = "Suggests next best PM actions based on current project context.";
  supportedInputTypes = ["text", "question"];

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const actions = [
      "Review at-risk milestone mitigation with owners.",
      "Prioritize open tasks due in next 72 hours.",
      "Confirm dependency commitment dates with external teams."
    ];

    if (context.projectContext.statusSummary === "Red") {
      actions.unshift("Trigger escalation and recovery plan update.");
    }

    return {
      workflowId: this.id,
      resultType: "advice",
      data: {
        summary: "Recommended next actions for project manager",
        actions
      },
      generatedAt: new Date(),
      confidenceScore: 0.82,
      warnings: []
    };
  }
}
