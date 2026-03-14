import type { WorkflowId } from "../services/workflows/baseWorkflow.js";

export interface AgentGoalRequest {
  tenantId: string;
  projectId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface PlannedStep {
  stepId: string;
  workflowId: WorkflowId;
  reason: string;
  inputHints?: Record<string, unknown>;
  dependsOnStepIds?: string[];
}

export interface ExecutionPlan {
  planId: string;
  goalType: string;
  confidenceScore: number;
  steps: PlannedStep[];
  maxSteps: number;
  createdAt: Date;
  warnings?: string[];
}

export interface StepExecutionRecord {
  stepId: string;
  workflowId: WorkflowId;
  order: number;
  success: boolean;
  startedAt: Date;
  finishedAt: Date;
  responseTimeMs: number;
  warningCount: number;
  error?: string;
}

export interface AgenticResponse {
  goalSummary: string;
  workflowsExecuted: string[];
  synthesizedSummary: string;
  keyFindings: string[];
  recommendedActions: string[];
  assumptionsMade: string[];
  warnings: string[];
  generatedAt: Date;
}

export interface AgenticExecutionResponse {
  planId: string;
  goalType: string;
  plannerConfidence: number;
  stopReason: "completed" | "max_steps_reached" | "step_failure" | "no_plan";
  stepExecutions: StepExecutionRecord[];
  response: AgenticResponse;
}
