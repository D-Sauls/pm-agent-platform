import type { ConnectorProvider, ExternalProjectData } from "../connectors/baseConnector.js";
import type { Milestone, NormalizedProjectSnapshot, Task } from "../models/entities.js";
import { ConnectorRouter } from "./connectorRouter.js";

export interface ProjectContextResult {
  snapshot: NormalizedProjectSnapshot;
  connectorUsed: ConnectorProvider | "internal-model";
}

// Collects project data from internal model and optional external PM system.
export class ProjectContextService {
  private connectorRouter = new ConnectorRouter();

  // Demo linkage map for MVP workflow; replace with persisted integration config.
  private projectIntegrationMap: Record<string, ConnectorProvider> = {
    "project-alpha": "clickup",
    "project-beta": "zoho",
    "project-gamma": "monday",
    "project-planner": "microsoft-planner",
    "project-msp": "microsoft-project"
  };

  async collectProjectContext(projectId: string): Promise<ProjectContextResult> {
    const provider = this.projectIntegrationMap[projectId];
    const connectorResult = await this.connectorRouter.fetchLatestProjectData(projectId, provider);

    if (connectorResult.data) {
      return {
        snapshot: this.normalizeExternalData(connectorResult.data),
        connectorUsed: connectorResult.connectorUsed
      };
    }

    return {
      snapshot: this.buildInternalSnapshot(projectId),
      connectorUsed: "internal-model"
    };
  }

  private normalizeExternalData(external: ExternalProjectData): NormalizedProjectSnapshot {
    const tasks: Task[] = external.tasks.map((task) => ({
      id: task.id,
      projectId: external.project.id,
      title: task.title,
      status: task.status,
      assignee: task.assignee,
      dueDate: task.dueDate
    }));

    const milestones: Milestone[] = external.milestones.map((milestone) => ({
      id: milestone.id,
      projectId: external.project.id,
      name: milestone.name,
      targetDate: milestone.targetDate,
      status: milestone.status
    }));

    return {
      sourceSystem: external.provider,
      project: external.project,
      tasks,
      milestones,
      risks: [
        {
          id: `${external.project.id}-risk-1`,
          projectId: external.project.id,
          summary: "UAT timeline pressure from late defect closure",
          probability: "Medium",
          impact: "High",
          mitigation: "Daily triage and contingency resourcing"
        }
      ],
      issues: [
        {
          id: `${external.project.id}-issue-1`,
          projectId: external.project.id,
          summary: "Dependency team has not confirmed integration slot",
          severity: "Medium",
          owner: "Integration Lead"
        }
      ],
      dependencies: [
        {
          id: `${external.project.id}-dep-1`,
          projectId: external.project.id,
          summary: "Security sign-off for release readiness",
          owner: "Security Team",
          dueDate: new Date(Date.now() + 2 * 86400000).toISOString()
        }
      ],
      sprints: []
    };
  }

  private buildInternalSnapshot(projectId: string): NormalizedProjectSnapshot {
    return {
      sourceSystem: "internal-model",
      project: {
        id: projectId,
        name: "Internal Program Baseline",
        owner: "Project Manager",
        status: "Green"
      },
      tasks: [
        {
          id: `${projectId}-task-1`,
          projectId,
          title: "Prepare weekly steering summary",
          status: "Done",
          assignee: "PM",
          dueDate: new Date().toISOString()
        },
        {
          id: `${projectId}-task-2`,
          projectId,
          title: "Confirm upcoming milestone owners",
          status: "In Progress",
          assignee: "PMO Analyst",
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString()
        }
      ],
      milestones: [
        {
          id: `${projectId}-ms-1`,
          projectId,
          name: "Phase Gate Review",
          targetDate: new Date(Date.now() + 5 * 86400000).toISOString(),
          status: "On Track"
        }
      ],
      risks: [],
      issues: [],
      dependencies: [],
      sprints: []
    };
  }
}
