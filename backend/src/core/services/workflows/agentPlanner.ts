import type { WorkflowId } from "./baseWorkflow.js";

export interface PlanResult {
  workflowId: WorkflowId;
  confidenceScore: number;
  rationale: string;
}

export class AgentPlanner {
  plan(message: string): PlanResult {
    const text = message.toLowerCase();

    if (this.hasAny(text, ["weekly report", "weekly highlight", "status report"])) {
      return {
        workflowId: "weekly_report",
        confidenceScore: 0.96,
        rationale: "Detected reporting keywords"
      };
    }
    if (
      this.hasAny(text, [
        "extract raid from these notes",
        "turn these notes into risks and issues",
        "identify risks from this meeting",
        "capture assumptions and dependencies",
        "risk",
        "issue",
        "assumption",
        "dependency",
        "raid"
      ])
    ) {
      return {
        workflowId: "raid_extraction",
        confidenceScore: 0.87,
        rationale: "Detected RAID extraction keywords"
      };
    }
    if (
      this.hasAny(text, [
        "assess this change request",
        "is this in scope",
        "what impact will this change have",
        "evaluate this scope change",
        "does this require change control",
        "change request",
        "assess change",
        "scope change",
        "impact"
      ])
    ) {
      return {
        workflowId: "change_assessment",
        confidenceScore: 0.9,
        rationale: "Detected change assessment keywords"
      };
    }
    if (
      this.hasAny(text, [
        "what should i focus on next",
        "delivery advice",
        "delivery risks",
        "top pm priorities",
        "project risks",
        "delivery blockers",
        "focus on next",
        "next actions",
        "what should i focus"
      ])
    ) {
      return {
        workflowId: "delivery_advisor",
        confidenceScore: 0.83,
        rationale: "Detected recommendation/advisor intent"
      };
    }
    if (this.hasAny(text, ["project summary", "summarize project", "summary"])) {
      return {
        workflowId: "project_summary",
        confidenceScore: 0.86,
        rationale: "Detected summary intent"
      };
    }

    return {
      workflowId: "project_summary",
      confidenceScore: 0.5,
      rationale: "Fallback to generic project summary"
    };
  }

  private hasAny(text: string, words: string[]): boolean {
    return words.some((word) => text.includes(word));
  }
}
