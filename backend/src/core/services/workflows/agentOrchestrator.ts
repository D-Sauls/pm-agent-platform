import type { NormalizedProjectContext } from "../../models/projectModels.js";
import type { TenantContext } from "../../models/tenantModels.js";
import { ProjectContextService } from "../ProjectContextService.js";
import { TenantContextService } from "../TenantContextService.js";
import { AgentPlanner } from "./agentPlanner.js";
import type { WorkflowResult } from "./baseWorkflow.js";
import { WorkflowRegistry } from "./workflowRegistry.js";

export interface ExecuteAgentInput {
  tenantId: string;
  projectId: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface AgentExecutionResponse {
  workflowId: string;
  confidenceScore: number;
  connectorUsed: string;
  result: WorkflowResult;
}

export class AgentOrchestrator {
  constructor(
    private readonly planner: AgentPlanner,
    private readonly workflowRegistry: WorkflowRegistry,
    private readonly tenantContextService: TenantContextService,
    private readonly projectContextService: ProjectContextService
  ) {}

  async execute(input: ExecuteAgentInput): Promise<AgentExecutionResponse> {
    const plan = this.planner.plan(input.message);
    const workflow = this.workflowRegistry.getWorkflow(plan.workflowId);

    const tenantContext: TenantContext = await this.tenantContextService.resolve(input.tenantId);
    const projectContext: NormalizedProjectContext = await this.projectContextService.getProjectContext(
      tenantContext,
      input.projectId
    );

    const result = await workflow.execute({
      tenantContext,
      projectContext,
      userRequest: input.message,
      workflowId: workflow.id,
      timestamp: new Date(),
      metadata: input.metadata
    });

    return {
      workflowId: workflow.id,
      confidenceScore: plan.confidenceScore,
      connectorUsed: projectContext.project.sourceSystem,
      result
    };
  }
}
