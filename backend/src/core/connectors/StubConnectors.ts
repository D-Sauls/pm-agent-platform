import type { BaseConnector, ConnectorStatus } from "./BaseConnector.js";
import type { Milestone, Project, Task } from "../models/projectModels.js";

class GenericStubConnector implements BaseConnector {
  constructor(public readonly sourceSystem: string) {}

  async getProject(projectId: string): Promise<Project | null> {
    return {
      projectId,
      tenantId: "tenant-acme",
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

  async getTasks(projectId: string): Promise<Task[]> {
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

  async getMilestones(projectId: string): Promise<Milestone[]> {
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

  async getStatus(_projectId: string): Promise<string> {
    return "Amber";
  }

  async healthCheck(): Promise<ConnectorStatus> {
    return { connector: this.sourceSystem, healthy: true };
  }
}

export const stubConnectors: BaseConnector[] = [
  new GenericStubConnector("clickup"),
  new GenericStubConnector("zoho"),
  new GenericStubConnector("monday"),
  new GenericStubConnector("planner"),
  new GenericStubConnector("project")
];
