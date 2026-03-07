import type { AdminAuditLog } from "../models/AdminAuditLog.js";
import type { AdminUser } from "../models/AdminUser.js";

// Records admin control-plane actions for traceability and governance.
export class AdminAuditService {
  private logs: AdminAuditLog[] = [];

  record(admin: AdminUser, action: string, tenantId?: string, details?: Record<string, unknown>): void {
    const entry: AdminAuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      adminUserId: admin.id,
      adminEmail: admin.email,
      adminRole: admin.role,
      action,
      tenantId,
      details,
      timestamp: new Date().toISOString()
    };
    this.logs.push(entry);
  }

  listRecent(limit = 200): AdminAuditLog[] {
    return [...this.logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  }
}
