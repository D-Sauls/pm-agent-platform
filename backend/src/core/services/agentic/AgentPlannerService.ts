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
    const text = this.normalize(request.message);
    const selected: WorkflowId[] = [];
    const warnings: string[] = [];

    const include = (workflowId: WorkflowId): void => {
      if (!allowedWorkflows.includes(workflowId) || selected.includes(workflowId)) {
        return;
      }
      selected.push(workflowId);
    };

    const hasAny = (phrases: string[]): boolean => phrases.some((phrase) => text.includes(phrase));

    if (hasAny(["what should i do next", "what should i complete next", "next training step", "next onboarding step", "do next"])) {
      include("next_training_step");
    }

    if (hasAny(["what am i missing", "compliance gaps", "overdue", "non compliant", "not compliant"])) {
      include("compliance_audit");
      include("requirement_status");
    }

    if (hasAny(["requirement status", "training status", "compliance status", "what is overdue for this user"])) {
      include("requirement_status");
    }

    if (hasAny(["learning progress", "training progress", "course progress", "completion status", "how far am i"])) {
      include("learning_progress");
    }

    if (hasAny(["what policies apply to my role", "role knowledge", "role policies", "role training resources", "why am i doing", "my role", "my job role"])) {
      include("role_knowledge_lookup");
      include("onboarding_recommendation");
    }

    if (hasAny(["recommend courses", "learning path", "training for role", "onboarding path", "complete every course", "all courses required", "which course", "shortest course", "fastest course"])) {
      include("course_recommendation");
      include("onboarding_recommendation");
    }

    if (hasAny(["recommended onboarding", "role onboarding", "training checklist", "summarize my onboarding"])) {
      include("onboarding_recommendation");
    }

    if (hasAny(["find policy", "policy lookup", "required policy", "policy for", "explain policy", "what does this policy mean"])) {
      include("policy_lookup");
      include("knowledge_explain");
    }

    if (hasAny(["sharepoint document", "find document", "microsoft 365 document", "locate corporate document", "sharepoint library"])) {
      include("sharepoint_document_lookup");
    }

    if (hasAny(["summarize document", "document summary", "summarize sharepoint", "explain this corporate document"])) {
      include("knowledge_document_summary");
    }

    if (hasAny(["explain lesson", "knowledge explain", "explain this lesson"])) {
      include("knowledge_explain");
    }

    if (hasAny(["mandatory training overdue", "completed security awareness", "did this employee acknowledge", "compliance audit"])) {
      include("compliance_audit");
    }

    if (selected.length === 0) {
      if (text.trim().length < 6) {
        throw new AppError(
          "WORKFLOW_EXECUTION_FAILED",
          "Unsupported or ambiguous goal: unable to determine a safe workflow plan.",
          400
        );
      }
      include("next_training_step");
      warnings.push("Planner fallback used: defaulted to next_training_step.");
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
    if (workflows.includes("next_training_step")) {
      return "next_training_step";
    }
    if (workflows.includes("compliance_audit")) {
      return "compliance_audit";
    }
    if (workflows.includes("requirement_status")) {
      return "requirement_status";
    }
    if (workflows.includes("course_recommendation") || workflows.includes("onboarding_recommendation")) {
      return "learning_recommendation";
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
    if (workflows.includes("role_knowledge_lookup")) {
      return "role_context";
    }
    return text.includes("policy") ? "knowledge_lookup" : "onboarding_guidance";
  }

  private estimateConfidence(goalType: string, stepCount: number, warningCount: number): number {
    const base = goalType === "onboarding_guidance" ? 0.74 : 0.9;
    const score = base - warningCount * 0.06 - Math.max(0, stepCount - 3) * 0.03;
    return Number(Math.max(0.4, Math.min(0.98, score)).toFixed(2));
  }

  private normalize(message: string): string {
    return message
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\bcourese\b/g, "course")
      .replace(/\bcoureses\b/g, "courses")
      .replace(/\bcource\b/g, "course")
      .replace(/\bcources\b/g, "courses")
      .replace(/\bcompliace\b/g, "compliance")
      .replace(/\bcomplaince\b/g, "compliance")
      .replace(/\btraning\b/g, "training")
      .replace(/\bcomplere\b/g, "complete");
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

