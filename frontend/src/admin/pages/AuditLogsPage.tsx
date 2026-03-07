import { useEffect, useState } from "react";
import { getAdminJson } from "../../api/adminClient";

interface UsageLogVm {
  tenantId: string;
  requestType: string;
  timestamp: string;
  connectorUsed: string;
  responseTime: number;
}

interface AdminAuditVm {
  id: string;
  adminEmail: string;
  action: string;
  tenantId?: string;
  timestamp: string;
}

export function AuditLogsPage() {
  const [usageLogs, setUsageLogs] = useState<UsageLogVm[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminAuditVm[]>([]);

  useEffect(() => {
    getAdminJson<UsageLogVm[]>("/logs/requests").then(setUsageLogs).catch(() => undefined);
    getAdminJson<AdminAuditVm[]>("/logs/admin-actions").then(setAdminLogs).catch(() => undefined);
  }, []);

  return (
    <section>
      <h2>Audit / Usage Logs</h2>
      <h3>Recent Requests</h3>
      {usageLogs.length === 0 ? <p>No request logs found.</p> : null}
      {usageLogs.slice(0, 20).map((row, idx) => (
        <p key={`${row.timestamp}-${idx}`}>
          [{row.timestamp}] {row.tenantId} {row.requestType} via {row.connectorUsed} ({row.responseTime}ms)
        </p>
      ))}

      <h3>Admin Actions</h3>
      {adminLogs.length === 0 ? <p>No admin audit logs found.</p> : null}
      {adminLogs.slice(0, 20).map((row) => (
        <p key={row.id}>
          [{row.timestamp}] {row.adminEmail} - {row.action} {row.tenantId ? `(${row.tenantId})` : ""}
        </p>
      ))}
    </section>
  );
}
