import { GraphConnector } from "./GraphConnector.js";
import { ExternalProjectData } from "../baseConnector.js";

// Planner-specific adapter built on Graph primitives.
export class PlannerConnector extends GraphConnector {
  override provider = "microsoft-planner";

  override async fetchProjectData(projectId: string): Promise<ExternalProjectData> {
    const base = await super.fetchProjectData(projectId);
    return {
      ...base,
      provider: this.provider,
      project: { ...base.project, name: "Planner Product Launch" }
    };
  }
}
