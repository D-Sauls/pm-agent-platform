import { AppError } from "../../errors/AppError.js";
import type { BaseWorkflow, WorkflowId } from "./baseWorkflow.js";

export class WorkflowRegistry {
  private workflows = new Map<WorkflowId, BaseWorkflow>();

  register(workflow: BaseWorkflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  getWorkflow(workflowId: WorkflowId): BaseWorkflow {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new AppError("WORKFLOW_EXECUTION_FAILED", `Workflow ${workflowId} not registered`, 500);
    }
    return workflow;
  }

  listWorkflows(): BaseWorkflow[] {
    return Array.from(this.workflows.values());
  }
}
