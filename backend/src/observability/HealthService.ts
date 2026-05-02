import type { ConnectorTelemetryService } from "./ConnectorTelemetryService.js";

export class HealthService {
  constructor(
    private readonly connectorTelemetryService: ConnectorTelemetryService,
    private storageReadyProbe: () => boolean,
    private runtimeRiskProbe: () => string[] = () => []
  ) {}

  setStorageReadyProbe(probe: () => boolean): void {
    this.storageReadyProbe = probe;
  }

  setRuntimeRiskProbe(probe: () => string[]): void {
    this.runtimeRiskProbe = probe;
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
    const warnings = this.runtimeRiskProbe();
    return {
      status: storageReady ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      checks: {
        storageReady,
        connectorRecentFailureCount: connectorFailures.length
      },
      warnings
    };
  }
}
