import { AppError } from "../../errors/AppError.js";
import type {
  AgentGoalRequest,
  AgenticExecutionResponse,
  StepExecutionRecord
} from "../../models/agenticModels.js";
import type { NormalizedProjectContext } from "../../models/projectModels.js";
import type { ProjectRepository } from "../../repositories/interfaces.js";
import { agenticTelemetryService, loggingService } from "../../../observability/runtime.js";
import { ProjectContextService } from "../ProjectContextService.js";
import { TenantContextService } from "../TenantContextService.js";
import type { WorkflowResult } from "../workflows/baseWorkflow.js";
import { WorkflowRegistry } from "../workflows/workflowRegistry.js";
import { AgentPlannerService } from "./AgentPlannerService.js";
import { ResultSynthesisService } from "./ResultSynthesisService.js";

export class AgenticOrchestratorService {
  constructor(
    private readonly plannerService: AgentPlannerService,
    private readonly workflowRegistry: WorkflowRegistry,
    private readonly tenantContextService: TenantContextService,
    private readonly projectContextService: ProjectContextService,
    private readonly projectRepository: ProjectRepository,
    private readonly synthesisService: ResultSynthesisService
  ) {}

  async executeGoal(request: AgentGoalRequest): Promise<AgenticExecutionResponse> {
    const orchestratorStart = Date.now();
    const plan = this.plannerService.createPlan(request);
    if (plan.steps.length === 0) {
      throw new AppError("WORKFLOW_EXECUTION_FAILED", "No valid workflow plan found for goal.", 400);
    }

    const tenantContext = await this.tenantContextService.resolve(request.tenantId);
    const projectContext = await this.resolveProjectContext(
      request.tenantId,
      request.projectId,
      tenantContext
    );

    const workflowResults: WorkflowResult[] = [];
    const stepExecutions: StepExecutionRecord[] = [];
    let stopReason: AgenticExecutionResponse["stopReason"] = "completed";
    let failureReason: string | undefined;

    for (let index = 0; index < plan.steps.length; index += 1) {
      const step = plan.steps[index];
      if (index >= plan.maxSteps) {
        stopReason = "max_steps_reached";
        break;
      }
      const startedAt = new Date();
      const start = Date.now();
      try {
        const workflow = this.workflowRegistry.getWorkflow(step.workflowId);
        const result = await workflow.execute({
          tenantContext,
          projectContext,
          userRequest: request.message,
          workflowId: workflow.id,
          timestamp: startedAt,
          metadata: {
            ...(request.metadata ?? {}),
            planId: plan.planId,
            stepId: step.stepId,
            inputHints: step.inputHints ?? {}
          }
        });
        workflowResults.push(result);
        stepExecutions.push({
          stepId: step.stepId,
          workflowId: step.workflowId,
          order: index + 1,
          success: true,
          startedAt,
          finishedAt: new Date(),
          responseTimeMs: Date.now() - start,
          warningCount: result.warnings.length
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown step failure";
        failureReason = message;
        stopReason = "step_failure";
        stepExecutions.push({
          stepId: step.stepId,
          workflowId: step.workflowId,
          order: index + 1,
          success: false,
          startedAt,
          finishedAt: new Date(),
          responseTimeMs: Date.now() - start,
          warningCount: 0,
          error: message
        });
        break;
      }
    }

    const response = this.synthesisService.synthesize(
      request.message,
      workflowResults,
      [...(plan.warnings ?? []), ...stepExecutions.filter((step) => !step.success).map((step) => step.error ?? "")]
    );

    const totalExecutionMs = Date.now() - orchestratorStart;
    agenticTelemetryService.record({
      planId: plan.planId,
      goalType: plan.goalType,
      tenantId: request.tenantId,
      workflowsSelected: plan.steps.map((step) => step.workflowId),
      stepOrder: stepExecutions.filter((step) => step.success).map((step) => step.workflowId),
      success: stopReason === "completed" || stopReason === "max_steps_reached",
      plannerConfidence: plan.confidenceScore,
      totalExecutionMs,
      stopReason,
      failureReason,
      timestamp: new Date().toISOString()
    });

    loggingService.info("agentic.execution.finished", {
      planId: plan.planId,
      goalType: plan.goalType,
      tenantId: request.tenantId,
      stopReason,
      plannerConfidence: plan.confidenceScore,
      stepsExecuted: stepExecutions.length,
      totalExecutionMs
    });

    return {
      planId: plan.planId,
      goalType: plan.goalType,
      plannerConfidence: plan.confidenceScore,
      stopReason,
      stepExecutions,
      response
    };
  }

  private async resolveProjectContext(
    tenantId: string,
    projectId: string | undefined,
    tenantContext: Awaited<ReturnType<TenantContextService["resolve"]>>
  ): Promise<NormalizedProjectContext> {
    return {
      project: {
        projectId: "onboarding-learning-compliance-context",
        tenantId,
        sourceSystem: "internal",
        name: "Onboarding Learning Compliance Context",
        deliveryMode: "hybrid",
        status: "Active"
      },
      tasks: [],
      milestones: [],
      risks: [],
      issues: [],
      dependencies: [],
      statusSummary: "Onboarding, learning, and compliance context only"
    };
  }
}
