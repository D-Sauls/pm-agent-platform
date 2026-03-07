import {
  ClickUpConnector,
  GraphConnector,
  MondayConnector,
  MicrosoftProjectConnector,
  PlannerConnector,
  ZohoConnector
} from "../connectors/index.js";
import type { BaseConnector, ConnectorProvider, ExternalProjectData } from "../connectors/baseConnector.js";

export interface ConnectorResult {
  connectorUsed: ConnectorProvider | "internal-model";
  data?: ExternalProjectData;
}

// Routes project requests to the configured external PM connector.
export class ConnectorRouter {
  private connectors: Record<ConnectorProvider, BaseConnector> = {
    "microsoft-graph": new GraphConnector(),
    clickup: new ClickUpConnector(),
    zoho: new ZohoConnector(),
    monday: new MondayConnector(),
    "microsoft-planner": new PlannerConnector(),
    "microsoft-project": new MicrosoftProjectConnector()
  };

  async fetchLatestProjectData(
    projectId: string,
    provider?: ConnectorProvider
  ): Promise<ConnectorResult> {
    if (!provider) {
      return { connectorUsed: "internal-model" };
    }

    const connector = this.connectors[provider];
    if (!connector) {
      return { connectorUsed: "internal-model" };
    }

    const data = await connector.fetchProjectData(projectId);
    return { connectorUsed: provider, data };
  }
}
