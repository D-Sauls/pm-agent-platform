import { useEffect, useState } from "react";
import { getAdminJson } from "../../api/adminClient";

interface ConnectorHealthVm {
  tenantId: string;
  connectorName: string;
  status: string;
  lastSyncTime?: string;
  lastError?: string;
  lastSuccessfulResponseTime?: number;
}

export function ConnectorHealthPage() {
  const [rows, setRows] = useState<ConnectorHealthVm[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminJson<ConnectorHealthVm[]>("/connectors")
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load connector health"));
  }, []);

  if (error) return <p style={{ color: "#b00020" }}>{error}</p>;

  return (
    <section>
      <h2>Connector Health</h2>
      {rows.length === 0 ? <p>No connector health data available.</p> : null}
      {rows.map((row) => (
        <article key={`${row.tenantId}-${row.connectorName}`} style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <p>
            <strong>{row.tenantId}</strong> - {row.connectorName} ({row.status})
          </p>
          <p>Last sync: {row.lastSyncTime ?? "n/a"}</p>
          <p>Last error: {row.lastError ?? "none"}</p>
          <p>Last response time: {row.lastSuccessfulResponseTime ?? "n/a"} ms</p>
        </article>
      ))}
    </section>
  );
}
