import { AppError } from "../../errors/AppError.js";
import type { AgentGoalRequest, ExecutionPlan, PlannedStep } from "../../models/agenticModels.js";
import type { WorkflowId } from "../workflows/baseWorkflow.js";
import type { WorkflowRegistry } from "../workflows/workflowRegistry.js";
import { workflowCapabilityMap } from "./workflowCapabilityMap.js";

export interface AgentPlannerStrategy {
  readonly mode: "deterministic" | "llm_assisted";
  plan(request: AgentGoalRequest, allowedWorkflows: WorkflowId[], maxSteps: number): ExecutionPlan;
}

export class DeterministicPlannerStrategy implements AgentPlannerStrategy {
  readonly mode = "deterministic" as const;

  plan(request: AgentGoalRequest, allowedWorkflows: WorkflowId[], maxSteps: number): ExecutionPlan {
    const text = request.message.toLowerCase();
    const selected: WorkflowId[] = [];
    const warnings: string[] = [];

    const include = (workflowId: WorkflowId): void => {
      if (!allowedWorkflows.includes(workflowId) || selected.includes(workflowId)) {
        return;
      }
      selected.push(workflowId);
    };

    const hasAny = (phrases: string[]): boolean => phrases.some((phrase) => text.includes(phrase));

    if (hasAny(["executive", "leadership", "project picture", "overview", "summary"])) {
      include("project_summary");
    }
    if (hasAny(["forecast", "on track", "slip", "capacity risk", "delivery trend"])) {
      include("forecast");
    }
    if (hasAny(["what should i do next", "focus on", "blockers", "delivery health", "do next"])) {
      include("delivery_advisor");
    }
    if (hasAny(["billable", "utilization", "time report", "billing summary"])) {
      if (hasAny(["month", "monthly"])) {
        include("monthly_billing_summary");
      } else {
        include("weekly_time_report");
      }
    }
    if (hasAny(["weekly report", "highlight report", "status report"])) {
      include("weekly_report");
    }
    if (hasAny(["change request", "scope change", "in scope", "change control"])) {
      include("change_assessment");
    }
    if (hasAny(["extract raid", "risks and issues from notes", "assumptions and dependencies"])) {
      include("raid_extraction");
    }
    if (hasAny(["recommend courses", "learning path", "training for role", "onboarding path"])) {
      include("course_recommendation");
    }
    if (hasAny(["recommended onboarding", "role onboarding", "training checklist", "onboarding path"])) {
      include("onboarding_recommendation");
    }
    if (hasAny(["what should i complete next", "next training step", "next onboarding step"])) {
      include("next_training_step");
    }
    if (hasAny(["what policies apply to my role", "role knowledge", "role policies", "role training resources"])) {
      include("role_knowledge_lookup");
    }
    if (hasAny(["find policy", "policy lookup", "required policy", "policy for"])) {
      include("policy_lookup");
    }
    if (hasAny(["sharepoint document", "find document", "microsoft 365 document", "locate corporate document", "sharepoint library"])) {
      include("sharepoint_document_lookup");
    }
    if (hasAny(["summarize document", "document summary", "summarize sharepoint", "explain this corporate document"])) {
      include("knowledge_document_summary");
    }
    if (hasAny(["learning progress", "training progress", "course progress", "completion status"])) {
      include("learning_progress");
    }
    if (hasAny(["explain policy", "explain lesson", "what does this policy mean", "knowledge explain"])) {
      include("knowledge_explain");
    }
    if (
      hasAny([
        "mandatory training overdue",
        "completed security awareness",
        "policy did this employee acknowledge",
        "compliance gaps",
        "compliance audit"
      ])
    ) {
      include("compliance_audit");
    }
    if (hasAny(["requirement status", "training status", "what is overdue for this user"])) {
      include("requirement_status");
    }

    if (selected.length === 0) {
      if (text.trim().length < 6) {
        throw new AppError(
          "WORKFLOW_EXECUTION_FAILED",
          "Unsupported or ambiguous goal: unable to determine a safe workflow plan.",
          400
        );
      }
      include("project_summary");
      warnings.push("Planner fallback used: defaulted to project_summary.");
    }

    const bounded = selected.slice(0, maxSteps);
    if (selected.length > bounded.length) {
      warnings.push(`Plan truncated from ${selected.length} to ${bounded.length} steps due to maxSteps.`);
    }

    const goalType = this.inferGoalType(text, bounded);
    const steps = bounded.map((workflowId, index) => this.toStep(workflowId, index));
    return {
      planId: `plan-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      goalType,
      confidenceScore: this.estimateConfidence(goalType, bounded.length, warnings.length),
      steps,
      maxSteps,
      createdAt: new Date(),
      warnings
    };
  }

  private toStep(workflowId: WorkflowId, index: number): PlannedStep {
    const capability = workflowCapabilityMap.find((entry) => entry.workflowId === workflowId);
    return {
      stepId: `step-${index + 1}`,
      workflowId,
      reason: capability
        ? `Selected for capability: ${capability.capabilities.slice(0, 2).join(", ")}`
        : "Selected by deterministic planner",
      dependsOnStepIds: index === 0 ? [] : [`step-${index}`]
    };
  }

  private inferGoalType(text: string, workflows: WorkflowId[]): string {
    if (workflows.includes("project_summary") && workflows.includes("forecast")) {
      return "executive_readiness";
    }
    if (workflows.includes("delivery_advisor") && workflows.includes("forecast")) {
      return "delivery_health";
    }
    if (workflows.includes("monthly_billing_summary") || workflows.includes("weekly_time_report")) {
      return "billing_time_insight";
    }
    if (workflows.includes("change_assessment")) {
      return "change_analysis";
    }
    if (workflows.includes("raid_extraction")) {
      return "raid_analysis";
    }
    if (workflows.includes("course_recommendation") || workflows.includes("onboarding_recommendation")) {
      return "learning_recommendation";
    }
    if (workflows.includes("next_training_step")) {
      return "next_training_step";
    }
    if (
      workflows.includes("policy_lookup") ||
      workflows.includes("knowledge_explain") ||
      workflows.includes("sharepoint_document_lookup") ||
      workflows.includes("knowledge_document_summary")
    ) {
      return "knowledge_lookup";
    }
    if (workflows.includes("learning_progress")) {
      return "learning_progress";
    }
    if (workflows.includes("compliance_audit")) {
      return "compliance_audit";
    }
    if (workflows.includes("requirement_status")) {
      return "requirement_status";
    }
    if (text.includes("weekly")) {
      return "weekly_reporting";
    }
    return "general_goal";
  }

  private estimateConfidence(goalType: string, stepCount: number, warningCount: number): number {
    const base = goalType === "general_goal" ? 0.68 : goalType === "weekly_reporting" ? 0.84 : 0.9;
    const score = base - warningCount * 0.06 - Math.max(0, stepCount - 3) * 0.03;
    return Number(Math.max(0.4, Math.min(0.98, score)).toFixed(2));
  }
}

export class AgentPlannerService {
  constructor(
    private readonly workflowRegistry: WorkflowRegistry,
    private readonly strategy: AgentPlannerStrategy = new DeterministicPlannerStrategy(),
    private readonly maxSteps = 4
  ) {}

  createPlan(request: AgentGoalRequest): ExecutionPlan {
    const allowedWorkflows = this.workflowRegistry.listWorkflows().map((workflow) => workflow.id);
    return this.strategy.plan(request, allowedWorkflows, this.maxSteps);
  }
}

