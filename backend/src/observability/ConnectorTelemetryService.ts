import { LoggingService } from "./LoggingService.js";

export type ConnectorStatus = "healthy" | "degraded" | "unhealthy";

export interface ConnectorTelemetryEvent {
  requestId: string;
  tenantId: string;
  connectorName: string;
  operation: string;
  status: ConnectorStatus;
  responseTimeMs: number;
  reason?: string;
  transitioned: boolean;
  timestamp: string;
}

export class ConnectorTelemetryService {
  private readonly events: ConnectorTelemetryEvent[] = [];
  private readonly statusMap = new Map<string, ConnectorStatus>();
  private readonly maxEvents = 1000;

  constructor(private readonly logger: LoggingService) {}

  record(
    input: Omit<ConnectorTelemetryEvent, "transitioned" | "timestamp">
  ): ConnectorTelemetryEvent {
    const key = `${input.tenantId}:${input.connectorName}`;
    const previous = this.statusMap.get(key);
    const transitioned = previous !== undefined && previous !== input.status;
    this.statusMap.set(key, input.status);

    const event: ConnectorTelemetryEvent = {
      ...input,
      transitioned,
      timestamp: new Date().toISOString()
    };
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    this.logger.info("connector.operation", { ...event });
    return event;
  }

  recent(limit = 100): ConnectorTelemetryEvent[] {
    return [...this.events].slice(-limit).reverse();
  }

  recentFailures(limit = 100): ConnectorTelemetryEvent[] {
    return this.recent(1000)
      .filter((entry) => entry.status !== "healthy")
      .slice(0, limit);
  }
}
