import { GraphConnector } from "./GraphConnector.js";
import { ExternalProjectData } from "../baseConnector.js";

// Microsoft Project-specific adapter built on Graph and Project endpoints.
export class MicrosoftProjectConnector extends GraphConnector {
  override provider = "microsoft-project";

  override async fetchProjectData(projectId: string): Promise<ExternalProjectData> {
    const base = await super.fetchProjectData(projectId);
    return {
      ...base,
      provider: this.provider,
      project: { ...base.project, name: "Microsoft Project Infrastructure Program" }
    };
  }
}
