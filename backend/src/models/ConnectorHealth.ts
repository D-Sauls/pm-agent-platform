export interface ConnectorHealth {
  tenantId: string;
  connectorName: string;
  status: "healthy" | "degraded" | "failed";
  lastSyncTime?: string;
  lastError?: string;
  lastSuccessfulResponseTime?: number;
}
