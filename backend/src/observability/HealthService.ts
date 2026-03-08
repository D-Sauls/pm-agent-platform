import type { ConnectorTelemetryService } from "./ConnectorTelemetryService.js";

export class HealthService {
  constructor(
    private readonly connectorTelemetryService: ConnectorTelemetryService,
    private storageReadyProbe: () => boolean
  ) {}

  setStorageReadyProbe(probe: () => boolean): void {
    this.storageReadyProbe = probe;
  }

  live() {
    return {
      status: "live",
      timestamp: new Date().toISOString()
    };
  }

  ready() {
    const storageReady = this.storageReadyProbe();
    const connectorFailures = this.connectorTelemetryService.recentFailures(20);
    return {
      status: storageReady ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      checks: {
        storageReady,
        connectorRecentFailureCount: connectorFailures.length
      }
    };
  }
}
