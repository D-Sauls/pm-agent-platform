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
    </section>
  );
}
