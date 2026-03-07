import type { AdminRole } from "./AdminUser.js";

export interface AdminAuditLog {
  id: string;
  adminUserId: string;
  adminEmail: string;
  adminRole: AdminRole;
  action: string;
  tenantId?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}
