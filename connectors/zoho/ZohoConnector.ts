import { BaseConnector, ExternalProjectData, type ConnectorProvider } from "../baseConnector.js";

export class ZohoConnector implements BaseConnector {
  provider: ConnectorProvider = "zoho";

  async fetchProjectData(projectId: string): Promise<ExternalProjectData> {
    const now = new Date();
    return {
      provider: this.provider,
      project: {
        id: projectId,
        name: "Zoho ERP Upgrade",
        owner: "Delivery Manager",
        status: "Green"
      },
      tasks: [
        {
          id: `${projectId}-zo-task-1`,
          title: "Approve integration test plan",
          status: "Done",
          assignee: "Integration Lead",
          dueDate: new Date(now.getTime() - 2 * 86400000).toISOString()
        },
        {
          id: `${projectId}-zo-task-2`,
          title: "Run mock cutover",
          status: "In Progress",
          assignee: "Cutover Manager",
          dueDate: new Date(now.getTime() + 2 * 86400000).toISOString()
        }
      ],
      milestones: [
        {
          id: `${projectId}-zo-ms-1`,
          name: "Cutover Readiness Review",
          targetDate: new Date(now.getTime() + 5 * 86400000).toISOString(),
          status: "On Track"
        }
      ]
    };
  }
}
