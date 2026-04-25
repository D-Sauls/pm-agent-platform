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
        "compliance audit",
        "missing for compliance",
        "not compliant"
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
        "what is overdue for this user",
        "overdue item",
        "pending requirement"
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
        "recommended courses",
        "do i need to complete every course",
        "all these courses",
        "quicker course",
        "quickest course",
        "shortest course"
      ])
    ) {
      return {
        workflowId: "course_recommendation",
        confidenceScore: 0.9,
        rationale: "Detected course recommendation intent"
      };
    }

    if (
      this.hasAny(text, [
        "what should i complete next",
        "what should i do next",
        "next training step",
        "next onboarding step",
        "what am i missing",
        "incomplete training"
      ])
    ) {
      return {
        workflowId: "next_training_step",
        confidenceScore: 0.9,
        rationale: "Detected next training step intent"
      };
    }

    if (
      this.hasAny(text, [
        "onboarding path",
        "recommended onboarding",
        "role onboarding",
        "training checklist",
        "summarize my onboarding",
        "onboarding journey"
      ])
    ) {
      return {
        workflowId: "onboarding_recommendation",
        confidenceScore: 0.9,
        rationale: "Detected onboarding recommendation intent"
      };
    }

    if (
      this.hasAny(text, [
        "what policies apply to my role",
        "role knowledge",
        "role policies",
        "role training resources",
        "my job role",
        "why am i doing this training",
        "why am i doing these courses"
      ])
    ) {
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

    if (this.hasAny(text, ["find policy", "policy lookup", "policy for", "required policy", "compliance policy", "pending policy"])) {
      return {
        workflowId: "policy_lookup",
        confidenceScore: 0.88,
        rationale: "Detected policy lookup intent"
      };
    }

    if (this.hasAny(text, ["learning progress", "course progress", "completion status", "training progress"])) {
      return {
        workflowId: "learning_progress",
        confidenceScore: 0.89,
        rationale: "Detected learning progress intent"
      };
    }

    if (
      (text.includes("explain") && this.hasAny(text, ["policy", "lesson", "course", "training"])) ||
      this.hasAny(text, [
        "explain this policy",
        "explain policy",
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

    if (this.hasLegacyProjectManagementIntent(text)) {
      return {
        workflowId: "next_training_step",
        confidenceScore: 0.5,
        rationale: "Legacy PM/time/billing/forecast intent is retired; defaulted to onboarding guidance"
      };
    }

    return {
      workflowId: "next_training_step",
      confidenceScore: 0.55,
      rationale: "Fallback to onboarding next-step guidance"
    };
  }

  private hasAny(text: string, phrases: string[]): boolean {
    return phrases.some((phrase) => text.includes(phrase));
  }

  private hasLegacyProjectManagementIntent(text: string): boolean {
    return this.hasAny(text, [
      "weekly report",
      "weekly highlight",
      "status report",
      "project summary",
      "project overview",
      "project status",
      "executive summary",
      "forecast",
      "slip",
      "capacity",
      "billable hours",
      "billing summary",
      "monthly billing",
      "weekly time report",
      "time report",
      "utilization",
      "raid",
      "risk register",
      "delivery advice",
      "delivery risks",
      "delivery blockers",
      "change request",
      "change control",
      "scope change",
      "clickup"
    ]);
  }
}
