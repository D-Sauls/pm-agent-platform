import { useEffect, useState } from "react";
import { getAdminJson, postAdminJson } from "../../api/adminClient";

interface TenantVm {
  tenantId: string;
  organizationName: string;
  planType: string;
  licenseStatus: string;
  connectorConfig: { enabledConnectors: string[] };
}

export function TenantsListPage() {
  const [tenants, setTenants] = useState<TenantVm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const rows = await getAdminJson<TenantVm[]>("/tenants");
      setTenants(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function suspend(tenantId: string) {
    await postAdminJson(`/tenants/${tenantId}/suspend`);
    await load();
  }

  async function reactivate(tenantId: string) {
    await postAdminJson(`/tenants/${tenantId}/reactivate`);
    await load();
  }

  if (loading) return <p>Loading tenants...</p>;
  if (error) return <p style={{ color: "#b00020" }}>{error}</p>;
  if (tenants.length === 0) return <p>No tenants found.</p>;

  return (
    <section>
      <h2>Tenants</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Tenant</th>
            <th align="left">Plan</th>
            <th align="left">License</th>
            <th align="left">Connectors</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.tenantId}>
              <td>{tenant.organizationName}</td>
              <td>{tenant.planType}</td>
              <td>{tenant.licenseStatus}</td>
              <td>{tenant.connectorConfig.enabledConnectors.join(", ")}</td>
              <td>
                <button onClick={() => suspend(tenant.tenantId)}>Suspend</button>{" "}
                <button onClick={() => reactivate(tenant.tenantId)}>Reactivate</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
