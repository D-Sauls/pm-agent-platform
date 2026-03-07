import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";

export class RaidExtractionWorkflow implements BaseWorkflow {
  id = "raid_extraction" as const;
  name = "RAID Extraction Workflow";
  description = "Extracts risks, issues, assumptions, and dependencies from request/context.";
  supportedInputTypes = ["text", "notes"];

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const notes = context.userRequest.toLowerCase();
    const risks = notes.includes("risk") ? [context.userRequest] : context.projectContext.risks.map((r) => r.title);
    const issues = notes.includes("issue")
      ? [context.userRequest]
      : context.projectContext.issues.map((i) => i.title);

    return {
      workflowId: this.id,
      resultType: "raid",
      data: {
        summary: "RAID extraction complete",
        risks,
        issues,
        assumptions: ["Assumes source notes are current for this reporting period."],
        dependencies: context.projectContext.dependencies.map((d) => d.title)
      },
      generatedAt: new Date(),
      confidenceScore: 0.78,
      warnings: risks.length === 0 && issues.length === 0 ? ["No explicit risks/issues detected"] : []
    };
  }
}
