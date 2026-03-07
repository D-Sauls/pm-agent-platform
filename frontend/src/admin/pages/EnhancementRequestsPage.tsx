import { useEffect, useState } from "react";
import { getAdminJson, patchAdminJson } from "../../api/adminClient";

interface EnhancementVm {
  id: string;
  tenantId: string;
  title: string;
  status: string;
  submittedBy: string;
  internalNotes: string;
}

export function EnhancementRequestsPage() {
  const [rows, setRows] = useState<EnhancementVm[]>([]);
  const [tenantFilter, setTenantFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    const query = new URLSearchParams();
    if (tenantFilter) query.set("tenantId", tenantFilter);
    if (statusFilter) query.set("status", statusFilter);
    const result = await getAdminJson<EnhancementVm[]>(`/enhancements?${query.toString()}`);
    setRows(result);
  }

  useEffect(() => {
    void load();
  }, [tenantFilter, statusFilter]);

  return (
    <section>
      <h2>Enhancement Requests Inbox</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          placeholder="Filter by tenant"
        />
        <input
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="Filter by status"
        />
      </div>
      {rows.length === 0 ? <p>No requests found.</p> : null}
      {rows.map((row) => (
        <article key={row.id} style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12, marginTop: 8 }}>
          <p>
            <strong>{row.title}</strong> ({row.status}) - {row.tenantId}
          </p>
          <button
            onClick={async () => {
              await patchAdminJson(`/enhancements/${row.id}/status`, { status: "under_review" });
              await load();
            }}
          >
            Mark Under Review
          </button>{" "}
          <button
            onClick={async () => {
              await patchAdminJson(`/enhancements/${row.id}/notes`, {
                internalNotes: "Reviewed by support team"
              });
              await load();
            }}
          >
            Add Internal Note
          </button>
        </article>
      ))}
    </section>
  );
}
