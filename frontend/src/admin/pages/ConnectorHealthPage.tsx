import { useEffect, useState } from "react";
import { getAdminJson, postAdminJson } from "../../api/adminClient";

interface ConnectorHealthVm {
  tenantId: string;
  connectorName: string;
  status: string;
  lastSyncTime?: string;
  lastError?: string;
  lastSuccessfulResponseTime?: number;
}

interface ConnectorHealthPageProps {
  adminRole: "superadmin" | "supportadmin" | "readonlyadmin";
}

export function ConnectorHealthPage({ adminRole }: ConnectorHealthPageProps) {
  const [rows, setRows] = useState<ConnectorHealthVm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState("");

  async function load() {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    await getAdminJson<ConnectorHealthVm[]>(`/connectors${query}`)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load connector health"));
  }

  useEffect(() => {
    void load();
  }, [tenantId]);

  async function runHealthTest(row: ConnectorHealthVm) {
    await postAdminJson(`/connectors/${row.tenantId}/${row.connectorName}/test`);
    await load();
  }

  if (error) return <p style={{ color: "#b00020" }}>{error}</p>;

  return (
    <section>
      <h2>Connector Health</h2>
      <input
        value={tenantId}
        onChange={(event) => setTenantId(event.target.value)}
        placeholder="Filter by tenant"
      />
      {rows.length === 0 ? <p>No connector health data available.</p> : null}
      {rows.map((row) => (
        <article key={`${row.tenantId}-${row.connectorName}`} style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <p>
            <strong>{row.tenantId}</strong> - {row.connectorName} ({row.status})
          </p>
          <p>Last sync: {row.lastSyncTime ?? "n/a"}</p>
          <p>Last error: {row.lastError ?? "none"}</p>
          <p>Last response time: {row.lastSuccessfulResponseTime ?? "n/a"} ms</p>
          {adminRole !== "readonlyadmin" ? (
            <button onClick={() => runHealthTest(row)}>Run Health Test</button>
          ) : null}
        </article>
      ))}
    </section>
  );
}
