import { LoggingService } from "./LoggingService.js";

export interface AgenticRunEvent {
  planId: string;
  goalType: string;
  tenantId: string;
  workflowsSelected: string[];
  stepOrder: string[];
  success: boolean;
  plannerConfidence: number;
  totalExecutionMs: number;
  stopReason: string;
  failureReason?: string;
  timestamp: string;
}

export class AgenticTelemetryService {
  private readonly runs: AgenticRunEvent[] = [];
  private readonly maxRuns = 500;

  constructor(private readonly logger: LoggingService) {}

  record(event: AgenticRunEvent): void {
    this.runs.push(event);
    if (this.runs.length > this.maxRuns) {
      this.runs.shift();
    }
    this.logger.info("agentic.run", { ...event });
  }

  recent(limit = 100): AgenticRunEvent[] {
    return [...this.runs].slice(-limit).reverse();
  }

  failed(limit = 100): AgenticRunEvent[] {
    return this.recent(500)
      .filter((run) => !run.success)
      .slice(0, limit);
  }

  topGoalTypes(limit = 5): Array<{ goalType: string; count: number }> {
    const counts = new Map<string, number>();
    for (const run of this.runs) {
      counts.set(run.goalType, (counts.get(run.goalType) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([goalType, count]) => ({ goalType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  topWorkflowChains(limit = 5): Array<{ chain: string; count: number }> {
    const counts = new Map<string, number>();
    for (const run of this.runs) {
      const key = run.stepOrder.join(" -> ");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([chain, count]) => ({ chain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
