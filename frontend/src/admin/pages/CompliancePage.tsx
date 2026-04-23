import { useEffect, useState } from "react";
import { getAdminJson, postAdminJson } from "../../api/adminClient";

interface CompliancePageProps {
  adminRole: "superadmin" | "supportadmin" | "readonlyadmin";
}

interface ComplianceSummaryVm {
  tenantSummary: {
    tenantId: string;
    total: number;
    completed: number;
    overdue: number;
    inProgress: number;
  };
  userSummary: {
    userId: string;
    statuses: Array<{ requirementId: string; status: string; dueDate?: string | null }>;
    overdueItems: Array<{ requirementId: string; status: string }>;
  };
}

export function CompliancePage({ adminRole }: CompliancePageProps) {
  const [tenantId, setTenantId] = useState("tenant-acme");
  const [userId, setUserId] = useState("user-fin-1");
  const [summary, setSummary] = useState<ComplianceSummaryVm | null>(null);
  const [acknowledgements, setAcknowledgements] = useState<Array<any>>([]);
  const [overrides, setOverrides] = useState<Array<any>>([]);
  const [error, setError] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("Imported completion evidence");

  async function load(): Promise<void> {
    try {
      setError(null);
      const [summaryResult, acknowledgementResult, overrideResult] = await Promise.all([
        getAdminJson<ComplianceSummaryVm>(`/compliance/summary?tenantId=${tenantId}&userId=${userId}&role=Finance%20Analyst`),
        getAdminJson<{ acknowledgements: Array<any> }>(`/compliance/acknowledgements?tenantId=${tenantId}&userId=${userId}`),
        getAdminJson<{ overrides: Array<any> }>(`/compliance/hr-overrides?tenantId=${tenantId}`)
      ]);
      setSummary(summaryResult);
      setAcknowledgements(acknowledgementResult.acknowledgements);
      setOverrides(overrideResult.overrides);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load compliance data");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section>
      <h2>Compliance</h2>
      <div className="admin-inline-form">
        <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Tenant ID" />
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" />
        <button type="button" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      {summary ? (
        <div className="admin-card-grid">
          <article className="admin-card">
            <h3>Tenant Summary</h3>
            <p>Total: {summary.tenantSummary.total}</p>
            <p>Completed: {summary.tenantSummary.completed}</p>
            <p>In Progress: {summary.tenantSummary.inProgress}</p>
            <p>Overdue: {summary.tenantSummary.overdue}</p>
          </article>
          <article className="admin-card">
            <h3>User Summary</h3>
            <p>User: {summary.userSummary.userId}</p>
            <p>Statuses: {summary.userSummary.statuses.length}</p>
            <p>Overdue: {summary.userSummary.overdueItems.length}</p>
          </article>
        </div>
      ) : (
        <p>Loading compliance summary...</p>
      )}

      <article className="admin-card admin-card--spaced">
        <h3>Acknowledgement Evidence</h3>
        {acknowledgements.length === 0 ? <p>No acknowledgement evidence found.</p> : null}
        {acknowledgements.map((entry) => (
          <p key={entry.id}>
            {entry.subjectType}:{entry.subjectId} - {entry.acknowledgementType} ({entry.status})
          </p>
        ))}
      </article>

      <article className="admin-card admin-card--spaced">
        <h3>HR Overrides</h3>
        {overrides.length === 0 ? <p>No HR overrides recorded.</p> : null}
        {overrides.map((entry) => (
          <p key={entry.id}>
            {entry.userId} - {entry.subjectType}:{entry.subjectId} - {entry.reason}
          </p>
        ))}
        {adminRole !== "readonlyadmin" ? (
          <div className="admin-stack admin-stack--spaced">
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={3}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await postAdminJson("/compliance/hr-overrides", {
                    tenantId,
                    userId,
                    subjectType: "course",
                    subjectId: "course-finance-onboarding",
                    reason: overrideReason
                  });
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to create HR override");
                }
              }}
            >
              Record HR Override
            </button>
          </div>
        ) : null}
      </article>
    </section>
  );
}
