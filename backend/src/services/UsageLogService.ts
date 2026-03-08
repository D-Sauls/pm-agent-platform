import type { UsageLog } from "../models/UsageLog.js";
import { loggingService } from "../observability/runtime.js";

// Captures per-tenant API consumption metrics for operational monitoring.
export class UsageLogService {
  private logs: UsageLog[] = [];

  recordUsage(entry: UsageLog): void {
    this.logs.push(entry);
    loggingService.info("legacy.usage_log", {
      requestId: entry.requestId,
      correlationId: entry.correlationId,
      tenantId: entry.tenantId,
      requestType: entry.requestType,
      connectorUsed: entry.connectorUsed,
      responseTime: entry.responseTime,
      success: entry.success ?? true
    });
  }

  listUsageByTenant(tenantId: string): UsageLog[] {
    return this.logs.filter((log) => log.tenantId === tenantId);
  }

  listRecent(limit = 100): UsageLog[] {
    return [...this.logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  }

  countRequestsSince(sinceIsoDate: string): number {
    return this.logs.filter((log) => log.timestamp >= sinceIsoDate).length;
  }

  topRequestTypes(limit = 5): Array<{ requestType: string; count: number }> {
    return this.buildTopRequestTypes(this.logs, limit);
  }

  topRequestTypesByTenant(tenantId: string, limit = 5): Array<{ requestType: string; count: number }> {
    return this.buildTopRequestTypes(this.logs.filter((log) => log.tenantId === tenantId), limit);
  }

  private buildTopRequestTypes(
    logs: UsageLog[],
    limit: number
  ): Array<{ requestType: string; count: number }> {
    const counts = new Map<string, number>();
    for (const log of logs) {
      const key = log.requestType;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([requestType, count]) => ({ requestType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
