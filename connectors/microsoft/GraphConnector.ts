import { BaseConnector, ExternalProjectData, type ConnectorProvider } from "../baseConnector.js";

// Base Microsoft 365 connector via Microsoft Graph.
export class GraphConnector implements BaseConnector {
  provider: ConnectorProvider = "microsoft-graph";

  async fetchProjectData(projectId: string): Promise<ExternalProjectData> {
    const now = new Date();
    return {
      provider: "microsoft-planner",
      project: {
        id: projectId,
        name: "Microsoft 365 Delivery Program",
        owner: "Project Owner",
        status: "Green"
      },
      tasks: [
        {
          id: `${projectId}-ms-task-1`,
          title: "Validate governance checklist",
          status: "In Progress",
          assignee: "PMO Analyst",
          dueDate: new Date(now.getTime() + 2 * 86400000).toISOString()
        }
      ],
      milestones: [
        {
          id: `${projectId}-ms-ms-1`,
          name: "Steering Committee Review",
          targetDate: new Date(now.getTime() + 7 * 86400000).toISOString(),
          status: "On Track"
        }
      ]
    };
  }
}
