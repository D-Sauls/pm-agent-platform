import { useEffect, useState } from "react";
import { getAdminJson, postAdminJson } from "../../api/adminClient";

interface TenantVm {
  tenantId: string;
  organizationName: string;
  planType: string;
  licenseStatus: string;
  connectorConfig: { enabledConnectors: string[] };
  lastActivity?: string | null;
}

interface TenantsListPageProps {
  adminRole: "superadmin" | "supportadmin" | "readonlyadmin";
  onOpenTenant: (tenantId: string) => void;
}

export function TenantsListPage({ adminRole, onOpenTenant }: TenantsListPageProps) {
  const [tenants, setTenants] = useState<TenantVm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      if (status) query.set("status", status);
      const rows = await getAdminJson<TenantVm[]>(`/tenants?${query.toString()}`);
      setTenants(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [search, status]);

  async function suspend(tenantId: string) {
    await postAdminJson(`/tenants/${tenantId}/suspend`);
    await load();
  }

  async function reactivate(tenantId: string) {
    await postAdminJson(`/tenants/${tenantId}/reactivate`);
    await load();
  }

  if (loading) return <p>Loading tenants...</p>;
  if (error) return <p className="admin-error">{error}</p>;

  return (
    <section>
      <h2>Tenants</h2>
      <div className="admin-inline-form">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tenant id or name"
        />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      {tenants.length === 0 ? <p>No tenants found.</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th align="left">Tenant</th>
            <th align="left">Plan</th>
            <th align="left">License</th>
            <th align="left">Connectors</th>
            <th align="left">Last Activity</th>
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
              <td>{tenant.lastActivity ?? "n/a"}</td>
              <td>
                <button onClick={() => onOpenTenant(tenant.tenantId)}>Details</button>{" "}
                {adminRole !== "readonlyadmin" ? (
                  <>
                    <button onClick={() => suspend(tenant.tenantId)}>Suspend</button>{" "}
                    <button onClick={() => reactivate(tenant.tenantId)}>Reactivate</button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
