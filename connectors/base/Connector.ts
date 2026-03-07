import { NormalizedProjectSnapshot } from "../../models/entities.js";

export interface ConnectorAuthConfig {
  type: "apiKey" | "oauth";
  token?: string;
  clientId?: string;
  clientSecret?: string;
}

// Common contract for all external PM system connectors.
export interface ProjectConnector {
  provider: string;
  connect(auth: ConnectorAuthConfig): Promise<void>;
  fetchProjectSnapshot(projectId: string): Promise<NormalizedProjectSnapshot>;
}
