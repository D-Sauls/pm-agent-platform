import { useEffect, useState } from "react";
import { getAdminJson } from "../../api/adminClient";

interface UsageLogVm {
  tenantId: string;
  requestType: string;
  timestamp: string;
  connectorUsed?: string;
  responseTime: number;
  success?: boolean;
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
  const [workflowFailures, setWorkflowFailures] = useState<Array<{
    tenantId?: string;
    workflowId?: string;
    errorCode?: string;
    timestamp: string;
  }>>([]);
  const [connectorFailures, setConnectorFailures] = useState<Array<{
    tenantId: string;
    connectorName: string;
    status: string;
    reason?: string;
    timestamp: string;
  }>>([]);
  const [agenticRuns, setAgenticRuns] = useState<
    Array<{
      planId: string;
      goalType: string;
      workflowsSelected: string[];
      success: boolean;
      timestamp: string;
    }>
  >([]);
  const [tenantFilter, setTenantFilter] = useState("");

  useEffect(() => {
    const query = new URLSearchParams({ page: "1", pageSize: "50" });
    if (tenantFilter) query.set("tenantId", tenantFilter);
    getAdminJson<{ items: UsageLogVm[] }>(`/logs/requests?${query.toString()}`)
      .then((result) => setUsageLogs(result.items))
      .catch(() => undefined);
    getAdminJson<{ items: AdminAuditVm[] }>("/logs/admin-actions?page=1&pageSize=50")
      .then((result) => setAdminLogs(result.items))
      .catch(() => undefined);
    getAdminJson<{ items: Array<{ tenantId?: string; workflowId?: string; errorCode?: string; timestamp: string }> }>(
      "/logs/workflow-failures"
    )
      .then((result) => setWorkflowFailures(result.items))
      .catch(() => undefined);
    getAdminJson<{
      items: Array<{
        tenantId: string;
        connectorName: string;
        status: string;
        reason?: string;
        timestamp: string;
      }>;
    }>("/logs/connector-failures")
      .then((result) => setConnectorFailures(result.items))
      .catch(() => undefined);
    getAdminJson<{
      items: Array<{
        planId: string;
        goalType: string;
        workflowsSelected: string[];
        success: boolean;
        timestamp: string;
      }>;
    }>("/logs/agentic-runs")
      .then((result) => setAgenticRuns(result.items))
      .catch(() => undefined);
  }, [tenantFilter]);

  return (
    <section>
      <h2>Audit / Usage Logs</h2>
      <input
        value={tenantFilter}
        onChange={(event) => setTenantFilter(event.target.value)}
        placeholder="Filter usage logs by tenant"
      />
      <h3>Recent Requests</h3>
      {usageLogs.length === 0 ? <p>No request logs found.</p> : null}
      {usageLogs.slice(0, 20).map((row, idx) => (
        <p key={`${row.timestamp}-${idx}`}>
          [{row.timestamp}] {row.tenantId} {row.requestType} via {row.connectorUsed ?? "n/a"} (
          {row.responseTime}ms) {row.success === false ? "failed" : "ok"}
        </p>
      ))}

      <h3>Admin Actions</h3>
      {adminLogs.length === 0 ? <p>No admin audit logs found.</p> : null}
      {adminLogs.slice(0, 20).map((row) => (
        <p key={row.id}>
          [{row.timestamp}] {row.adminEmail} - {row.action} {row.tenantId ? `(${row.tenantId})` : ""}
        </p>
      ))}

      <h3>Workflow Failures</h3>
      {workflowFailures.length === 0 ? <p>No workflow failures captured.</p> : null}
      {workflowFailures.slice(0, 20).map((row, index) => (
        <p key={`${row.timestamp}-${index}`}>
          [{row.timestamp}] {row.tenantId ?? "n/a"} {row.workflowId ?? "unknown"} {row.errorCode ?? ""}
        </p>
      ))}

      <h3>Connector Failures</h3>
      {connectorFailures.length === 0 ? <p>No connector failures captured.</p> : null}
      {connectorFailures.slice(0, 20).map((row, index) => (
        <p key={`${row.timestamp}-${index}`}>
          [{row.timestamp}] {row.tenantId} {row.connectorName} ({row.status}) {row.reason ?? ""}
        </p>
      ))}

      <h3>Recent Agentic Runs</h3>
      {agenticRuns.length === 0 ? <p>No agentic runs captured.</p> : null}
      {agenticRuns.slice(0, 20).map((row) => (
        <p key={row.planId}>
          [{row.timestamp}] {row.goalType} [{row.workflowsSelected.join(" -> ")}]{" "}
          {row.success ? "ok" : "failed"}
        </p>
      ))}
    </section>
  );
}
