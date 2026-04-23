import type { ConnectorHealth } from "../models/ConnectorHealth.js";

// Provides operational connector health snapshots for admin monitoring.
export class ConnectorHealthService {
  private healthRows: ConnectorHealth[] = [
    {
      tenantId: "tenant-acme",
      connectorName: "sharepoint",
      status: "healthy",
      lastSyncTime: new Date().toISOString(),
      lastSuccessfulResponseTime: 420
    },
    {
      tenantId: "tenant-beta",
      connectorName: "microsoft-graph",
      status: "failed",
      lastSyncTime: new Date(Date.now() - 3600_000).toISOString(),
      lastError: "Consent required"
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

  countIssues(): number {
    return this.healthRows.filter((row) => row.status !== "healthy").length;
  }

  runManualHealthCheck(tenantId: string, connectorName: string): ConnectorHealth {
    const existingIndex = this.healthRows.findIndex(
      (row) => row.tenantId === tenantId && row.connectorName === connectorName
    );
    const checkedAt = new Date().toISOString();

    const updated: ConnectorHealth = {
      tenantId,
      connectorName,
      status: "healthy",
      lastSyncTime: checkedAt,
      lastError: undefined,
      lastSuccessfulResponseTime: 150
    };

    if (existingIndex >= 0) {
      this.healthRows[existingIndex] = updated;
    } else {
      this.healthRows.push(updated);
    }

    return updated;
  }
}
