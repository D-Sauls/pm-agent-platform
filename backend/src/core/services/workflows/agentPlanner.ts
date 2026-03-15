import type { WorkflowId } from "./baseWorkflow.js";

export interface PlanResult {
  workflowId: WorkflowId;
  confidenceScore: number;
  rationale: string;
}

export class AgentPlanner {
  plan(message: string): PlanResult {
    const text = message.toLowerCase();

    if (
      this.hasAny(text, [
        "mandatory training overdue",
        "completed security awareness",
        "policy did this employee acknowledge",
        "compliance gaps",
        "compliance audit"
      ])
    ) {
      return {
        workflowId: "compliance_audit",
        confidenceScore: 0.9,
        rationale: "Detected compliance audit intent"
      };
    }
    if (
      this.hasAny(text, [
        "requirement status",
        "training status",
        "compliance status for user",
        "what is overdue for this user"
      ])
    ) {
      return {
        workflowId: "requirement_status",
        confidenceScore: 0.89,
        rationale: "Detected requirement status intent"
      };
    }
    if (
      this.hasAny(text, [
        "recommend courses",
        "training for role",
        "learning path",
        "onboarding path",
        "recommended courses"
      ])
    ) {
      return {
        workflowId: "course_recommendation",
        confidenceScore: 0.9,
        rationale: "Detected course recommendation intent"
      };
    }
    if (this.hasAny(text, ["what should i complete next", "next training step", "next onboarding step"])) {
      return {
        workflowId: "next_training_step",
        confidenceScore: 0.9,
        rationale: "Detected next training step intent"
      };
    }
    if (this.hasAny(text, ["onboarding path", "recommended onboarding", "role onboarding", "training checklist"])) {
      return {
        workflowId: "onboarding_recommendation",
        confidenceScore: 0.9,
        rationale: "Detected onboarding recommendation intent"
      };
    }
    if (this.hasAny(text, ["what policies apply to my role", "role knowledge", "role policies", "role training resources"])) {
      return {
        workflowId: "role_knowledge_lookup",
        confidenceScore: 0.87,
        rationale: "Detected role knowledge lookup intent"
      };
    }
    if (this.hasAny(text, ["sharepoint document", "find document", "microsoft 365 document", "sharepoint library"])) {
      return {
        workflowId: "sharepoint_document_lookup",
        confidenceScore: 0.87,
        rationale: "Detected SharePoint document lookup intent"
      };
    }
    if (this.hasAny(text, ["summarize document", "document summary", "summarize sharepoint", "corporate document summary"])) {
      return {
        workflowId: "knowledge_document_summary",
        confidenceScore: 0.84,
        rationale: "Detected document summary intent"
      };
    }
    if (
      this.hasAny(text, [
        "find policy",
        "policy lookup",
        "policy for",
        "required policy",
        "compliance policy"
      ])
    ) {
      return {
        workflowId: "policy_lookup",
        confidenceScore: 0.88,
        rationale: "Detected policy lookup intent"
      };
    }
    if (
      this.hasAny(text, [
        "learning progress",
        "course progress",
        "completion status",
        "training progress"
      ])
    ) {
      return {
        workflowId: "learning_progress",
        confidenceScore: 0.89,
        rationale: "Detected learning progress intent"
      };
    }
    if (
      this.hasAny(text, [
        "explain this policy",
        "explain this lesson",
        "knowledge explain",
        "what does this policy mean",
        "explain this course"
      ])
    ) {
      return {
        workflowId: "knowledge_explain",
        confidenceScore: 0.82,
        rationale: "Detected knowledge explanation intent"
      };
    }
    if (
      this.hasAny(text, [
        "monthly billing summary",
        "billable hours this month",
        "utilization this month",
        "monthly billing",
        "billing summary this month"
      ])
    ) {
      return {
        workflowId: "monthly_billing_summary",
        confidenceScore: 0.93,
        rationale: "Detected monthly billing summary intent"
      };
    }
    if (
      this.hasAny(text, [
        "weekly time report",
        "billable hours this week",
        "team utilization this week",
        "weekly utilization",
        "time report this week"
      ])
    ) {
      return {
        workflowId: "weekly_time_report",
        confidenceScore: 0.92,
        rationale: "Detected weekly time report intent"
      };
    }
    if (this.hasAny(text, ["weekly report", "weekly highlight", "status report"])) {
      return {
        workflowId: "weekly_report",
        confidenceScore: 0.96,
        rationale: "Detected reporting keywords"
      };
    }
    if (
      this.hasAny(text, [
        "forecast delivery risk",
        "forecast project status",
        "will this project slip",
        "forecast team capacity",
        "forecast billable hours",
        "forecast project capacity",
        "forecast team workload",
        "show forecast for this project",
        "forecast",
        "slip",
        "capacity",
        "billable hours",
        "workload",
        "delivery risk",
        "project forecast"
      ])
    ) {
      return {
        workflowId: "forecast",
        confidenceScore: 0.88,
        rationale: "Detected forecasting intent"
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
        confidenceScore: 0.9,
        rationale: "Detected delivery advisor intent"
      };
    }
    if (
      this.hasAny(text, [
        "summarize this project",
        "project overview",
        "project status",
        "project summary",
        "executive summary"
      ])
    ) {
      return {
        workflowId: "project_summary",
        confidenceScore: 0.9,
        rationale: "Detected project summary intent"
      };
    }

    return {
      workflowId: "weekly_report",
      confidenceScore: 0.55,
      rationale: "Fallback to weekly report workflow"
    };
  }

  private hasAny(text: string, phrases: string[]): boolean {
    return phrases.some((phrase) => text.includes(phrase));
  }
}

