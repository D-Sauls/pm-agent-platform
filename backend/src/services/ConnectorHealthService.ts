import type { ConnectorHealth } from "../models/ConnectorHealth.js";

// Provides operational connector health snapshots for admin monitoring.
export class ConnectorHealthService {
  private healthRows: ConnectorHealth[] = [
    {
      tenantId: "tenant-acme",
      connectorName: "clickup",
      status: "healthy",
      lastSyncTime: new Date().toISOString(),
      lastSuccessfulResponseTime: 420
    },
    {
      tenantId: "tenant-beta",
      connectorName: "zoho",
      status: "failed",
      lastSyncTime: new Date(Date.now() - 3600_000).toISOString(),
      lastError: "401 invalid refresh token"
    }
  ];

  listAll(): ConnectorHealth[] {
    return this.healthRows;
  }

  listByTenant(tenantId: string): ConnectorHealth[] {
    return this.healthRows.filter((row) => row.tenantId === tenantId);
  }

  countFailedSyncs(): number {
    return this.healthRows.filter((row) => row.status === "failed").length;
  }
}
