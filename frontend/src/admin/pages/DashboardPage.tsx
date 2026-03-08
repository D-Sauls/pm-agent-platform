import { useEffect, useState } from "react";
import { getAdminJson } from "../../api/adminClient";

interface DashboardSummary {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  activeLicenses: number;
  failedConnectorSyncs: number;
  enhancementRequestsPendingReview: number;
  totalRequestsLast24Hours: number;
  recentAdminActions: Array<{ id: string; adminEmail: string; action: string; timestamp: string }>;
  recentWorkflowActivity: Array<{
    tenantId: string;
    requestType: string;
    timestamp: string;
    responseTime: number;
    success?: boolean;
  }>;
  topUsedWorkflows: Array<{ requestType: string; count: number }>;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminJson<DashboardSummary>("/dashboard")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  if (error) return <p style={{ color: "#b00020" }}>{error}</p>;
  if (!data) return <p>Loading dashboard...</p>;

  const cards = [
    ["Total Tenants", data.totalTenants],
    ["Active Tenants", data.activeTenants],
    ["Suspended Tenants", data.suspendedTenants],
    ["Active Licenses", data.activeLicenses],
    ["Failed Connector Syncs", data.failedConnectorSyncs],
    ["Enhancement Requests Pending", data.enhancementRequestsPendingReview],
    ["Requests Last 24h", data.totalRequestsLast24Hours]
  ];

  return (
    <section>
      <h2>Dashboard</h2>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {cards.map(([label, value]) => (
          <article key={String(label)} style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12 }}>
            <p>{label}</p>
            <h3>{value}</h3>
          </article>
        ))}
      </div>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
        <article style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12 }}>
          <h3>Top Used Workflows</h3>
          {data.topUsedWorkflows.length === 0 ? <p>No workflow activity yet.</p> : null}
          {data.topUsedWorkflows.map((row) => (
            <p key={row.requestType}>
              {row.requestType}: {row.count}
            </p>
          ))}
        </article>
        <article style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12 }}>
          <h3>Recent Admin Actions</h3>
          {data.recentAdminActions.length === 0 ? <p>No admin actions yet.</p> : null}
          {data.recentAdminActions.map((row) => (
            <p key={row.id}>
              [{row.timestamp}] {row.adminEmail} - {row.action}
            </p>
          ))}
        </article>
      </div>
      <article style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12, marginTop: 16 }}>
        <h3>Recent Workflow Activity</h3>
        {data.recentWorkflowActivity.length === 0 ? <p>No workflow activity yet.</p> : null}
        {data.recentWorkflowActivity.map((row, index) => (
          <p key={`${row.timestamp}-${index}`}>
            [{row.timestamp}] {row.tenantId} {row.requestType} ({row.responseTime}ms){" "}
            {row.success === false ? "failed" : "ok"}
          </p>
        ))}
      </article>
    </section>
  );
}
