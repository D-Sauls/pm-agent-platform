import { BaseConnector, ExternalProjectData } from "../baseConnector.js";

export class MondayConnector implements BaseConnector {
  provider = "monday";

  async fetchProjectData(projectId: string): Promise<ExternalProjectData> {
    const now = new Date();
    return {
      provider: this.provider,
      project: {
        id: projectId,
        name: "Monday Platform Migration",
        owner: "PMO Lead",
        status: "Amber"
      },
      tasks: [
        {
          id: `${projectId}-mo-task-1`,
          title: "Finalize training deck",
          status: "Done",
          assignee: "Change Lead",
          dueDate: new Date(now.getTime() - 86400000).toISOString()
        },
        {
          id: `${projectId}-mo-task-2`,
          title: "Complete wave-2 rollout",
          status: "Not Started",
          assignee: "Regional PM",
          dueDate: new Date(now.getTime() + 4 * 86400000).toISOString()
        }
      ],
      milestones: [
        {
          id: `${projectId}-mo-ms-1`,
          name: "Wave-2 Deployment",
          targetDate: new Date(now.getTime() + 6 * 86400000).toISOString(),
          status: "At Risk"
        }
      ]
    };
  }
}
