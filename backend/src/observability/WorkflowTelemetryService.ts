import { LoggingService } from "./LoggingService.js";

export interface WorkflowTelemetryEvent {
  requestId: string;
  tenantId?: string;
  workflowId?: string;
  workflowType?: string;
  connectorUsed?: string | null;
  success: boolean;
  responseTimeMs: number;
  warningsCount?: number;
  errorCode?: string;
  timestamp: string;
}

export class WorkflowTelemetryService {
  private readonly events: WorkflowTelemetryEvent[] = [];
  private readonly maxEvents = 1000;

  constructor(private readonly logger: LoggingService) {}

  record(event: WorkflowTelemetryEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    this.logger.info("workflow.execution", { ...event });
  }

  recent(limit = 100): WorkflowTelemetryEvent[] {
    return [...this.events].slice(-limit).reverse();
  }

  failures(limit = 100): WorkflowTelemetryEvent[] {
    return this.recent(1000)
      .filter((entry) => !entry.success)
      .slice(0, limit);
  }
}
