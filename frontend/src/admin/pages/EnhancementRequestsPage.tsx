import { useEffect, useState } from "react";
import { getAdminJson, patchAdminJson } from "../../api/adminClient";

interface EnhancementVm {
  id: string;
  tenantId: string;
  title: string;
  status: string;
  submittedBy: string;
  urgency: string;
  expectedBenefit: string;
  currentWorkaround: string;
  createdDate: string;
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
      <div className="admin-inline-form">
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
      <div className="admin-stack">
        {rows.map((row) => (
          <article key={row.id} className="admin-card">
            <p>
              <strong>{row.title}</strong> ({row.status}) - {row.tenantId}
            </p>
            <p>Submitted by: {row.submittedBy}</p>
            <p>Urgency: {row.urgency}</p>
            <p>Expected benefit: {row.expectedBenefit}</p>
            <p>Current workaround: {row.currentWorkaround}</p>
            <p>Created: {row.createdDate}</p>
            <p>Internal notes: {row.internalNotes || "none"}</p>
            <button
              onClick={async () => {
                await patchAdminJson(`/enhancements/${row.id}/status`, { status: "reviewing" });
                await load();
              }}
            >
              Mark Reviewing
            </button>{" "}
            <button
              onClick={async () => {
                await patchAdminJson(`/enhancements/${row.id}/status`, { status: "backlog" });
                await load();
              }}
            >
              Move to Backlog
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
      </div>
    </section>
  );
}
