import type { BaseConnector } from "./BaseConnector.js";
import type { ConnectorHealthResult } from "../models/connectorModels.js";
import type { Milestone, Project, Task } from "../models/projectModels.js";
import type { TenantContext } from "../models/tenantModels.js";
import type { TimeEntry } from "../models/timeModels.js";

class GenericStubConnector implements BaseConnector {
  constructor(public readonly sourceSystem: string) {}

  async getProject(tenantContext: TenantContext, projectId: string): Promise<Project | null> {
    return {
      projectId,
      tenantId: tenantContext.tenant.tenantId,
      sourceSystem: this.sourceSystem,
      externalProjectId: `${this.sourceSystem}-${projectId}`,
      name: `${this.sourceSystem.toUpperCase()} Project ${projectId}`,
      deliveryMode: "hybrid",
      status: "On Track",
      startDate: new Date(Date.now() - 10 * 86400_000),
      endDate: new Date(Date.now() + 30 * 86400_000),
      owner: "Project Manager"
    };
  }

  async getTasks(_tenantContext: TenantContext, projectId: string): Promise<Task[]> {
    return [
      {
        taskId: `${this.sourceSystem}-${projectId}-task-1`,
        projectId,
        sourceSystem: this.sourceSystem,
        title: "Complete sprint objective",
        status: "Done",
        assignee: "Team Lead",
        dueDate: new Date(Date.now() - 86400_000)
      },
      {
        taskId: `${this.sourceSystem}-${projectId}-task-2`,
        projectId,
        sourceSystem: this.sourceSystem,
        title: "Finalize test evidence",
        status: "In Progress",
        assignee: "QA Engineer",
        dueDate: new Date(Date.now() + 2 * 86400_000)
      }
    ];
  }

  async getMilestones(_tenantContext: TenantContext, projectId: string): Promise<Milestone[]> {
    return [
      {
        milestoneId: `${this.sourceSystem}-${projectId}-milestone-1`,
        projectId,
        sourceSystem: this.sourceSystem,
        title: "Release readiness review",
        targetDate: new Date(Date.now() + 5 * 86400_000),
        status: "At Risk"
      }
    ];
  }

  async getStatus(_tenantContext: TenantContext, _projectId: string): Promise<string> {
    return "Amber";
  }

  async getTimeEntries(
    tenantContext: TenantContext,
    projectId: string
  ): Promise<TimeEntry[]> {
    return [
      {
        timeEntryId: `${this.sourceSystem}-${projectId}-time-1`,
        tenantId: tenantContext.tenant.tenantId,
        projectId,
        sourceSystem: this.sourceSystem,
        userId: "stub-user-1",
        userDisplayName: "Stub User",
        entryDate: new Date(),
        hours: 2,
        billableStatus: "billable",
        description: "Stub tracked time"
      }
    ];
  }

  async healthCheck(tenantContext: TenantContext): Promise<ConnectorHealthResult> {
    return {
      connectorName: this.sourceSystem,
      tenantId: tenantContext.tenant.tenantId,
      status: "healthy",
      checkedAt: new Date(),
      message: "Stub connector healthy"
    };
  }
}

export const stubConnectors: BaseConnector[] = [
  new GenericStubConnector("clickup"),
  new GenericStubConnector("zoho"),
  new GenericStubConnector("monday"),
  new GenericStubConnector("planner"),
  new GenericStubConnector("project")
];
