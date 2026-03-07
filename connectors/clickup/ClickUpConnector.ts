import { BaseConnector, ExternalProjectData } from "../baseConnector.js";

export class ClickUpConnector implements BaseConnector {
  provider = "clickup";

  async fetchProjectData(projectId: string): Promise<ExternalProjectData> {
    const now = new Date();
    return {
      provider: this.provider,
      project: {
        id: projectId,
        name: "ClickUp Delivery Rollout",
        owner: "Program Manager",
        status: "Amber"
      },
      tasks: [
        {
          id: `${projectId}-cu-task-1`,
          title: "Finalize UAT defect triage",
          status: "In Progress",
          assignee: "QA Lead",
          dueDate: new Date(now.getTime() + 86400000).toISOString()
        },
        {
          id: `${projectId}-cu-task-2`,
          title: "Complete deployment checklist",
          status: "Done",
          assignee: "Release Manager",
          dueDate: new Date(now.getTime() - 86400000).toISOString()
        }
      ],
      milestones: [
        {
          id: `${projectId}-cu-ms-1`,
          name: "Production Go/No-Go",
          targetDate: new Date(now.getTime() + 3 * 86400000).toISOString(),
          status: "At Risk"
        }
      ]
    };
  }
}
