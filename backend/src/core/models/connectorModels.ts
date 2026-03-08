export type ConnectorAuthType = "api_key";
export type ConnectorHealthStatus = "healthy" | "degraded" | "unhealthy";

export interface ConnectorConfig {
  tenantId: string;
  connectorName: string;
  authType: ConnectorAuthType;
  baseUrl?: string | null;
  workspaceId?: string | null;
  teamId?: string | null;
  listId?: string | null;
  folderId?: string | null;
  isEnabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface ConnectorHealthResult {
  connectorName: string;
  tenantId: string;
  status: ConnectorHealthStatus;
  checkedAt: Date;
  message: string;
  details?: Record<string, unknown>;
}
