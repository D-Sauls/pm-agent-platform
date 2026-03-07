import { useEffect, useState } from "react";
import { getAdminJson } from "../../api/adminClient";

interface TenantDetailVm {
  tenant: {
    tenantId: string;
    organizationName: string;
    planType: string;
    licenseStatus: string;
    connectorConfig: { enabledConnectors: string[] };
    featureFlags?: Record<string, boolean>;
    promptVersion?: string;
  };
  usageSummary: { totalRequests: number };
}

export function TenantDetailPage() {
  const [tenantId, setTenantId] = useState("tenant-acme");
  const [data, setData] = useState<TenantDetailVm | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminJson<TenantDetailVm>(`/tenants/${tenantId}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load tenant"));
  }, [tenantId]);

  return (
    <section>
      <h2>Tenant Detail</h2>
      <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
      {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}
      {data ? (
        <article style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12, marginTop: 8 }}>
          <p>
            <strong>Organization:</strong> {data.tenant.organizationName}
          </p>
          <p>
            <strong>Plan:</strong> {data.tenant.planType}
          </p>
          <p>
            <strong>License:</strong> {data.tenant.licenseStatus}
          </p>
          <p>
            <strong>Enabled Connectors:</strong> {data.tenant.connectorConfig.enabledConnectors.join(", ")}
          </p>
          <p>
            <strong>Prompt Version:</strong> {data.tenant.promptVersion ?? "default"}
          </p>
          <p>
            <strong>Usage Requests:</strong> {data.usageSummary.totalRequests}
          </p>
        </article>
      ) : (
        <p>Loading tenant detail...</p>
      )}
    </section>
  );
}
