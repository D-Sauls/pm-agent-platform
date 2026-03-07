import type { UsageLog } from "../models/UsageLog.js";

// Captures per-tenant API consumption metrics for operational monitoring.
export class UsageLogService {
  private logs: UsageLog[] = [];

  recordUsage(entry: UsageLog): void {
    this.logs.push(entry);
    console.info("[TenantUsage]", JSON.stringify(entry));
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
}
