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
  license?: {
    status: string;
    planType: string;
    expiryDate?: string;
    updatedAt?: string;
    latestValidationResult?: string;
  };
  connectorHealth: Array<{
    connectorName: string;
    status: string;
    lastSyncTime?: string;
    lastError?: string;
  }>;
  featureFlags: { flags: Record<string, boolean> };
  promptAssignments: Array<{ promptKey: string; activeVersion: string }>;
  usageSummary: {
    totalRequests: number;
    lastActivity?: string | null;
    topWorkflows?: Array<{ requestType: string; count: number }>;
  };
  recentErrors?: Array<{ timestamp: string; requestType: string; errorMessage?: string }>;
}

interface TenantDetailPageProps {
  tenantId: string;
  onTenantIdChange: (tenantId: string) => void;
}

export function TenantDetailPage({ tenantId, onTenantIdChange }: TenantDetailPageProps) {
  const [data, setData] = useState<TenantDetailVm | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    getAdminJson<TenantDetailVm>(`/tenants/${tenantId}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load tenant"));
  }, [tenantId]);

  return (
    <section>
      <h2>Tenant Detail</h2>
      <input value={tenantId} onChange={(e) => onTenantIdChange(e.target.value)} />
      {error ? <p className="admin-error">{error}</p> : null}
      {data ? (
        <article className="admin-card admin-card--spaced">
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
          <p>
            <strong>Last Activity:</strong> {data.usageSummary.lastActivity ?? "n/a"}
          </p>
          <p>
            <strong>License Validation:</strong> {data.license?.latestValidationResult ?? "n/a"}
          </p>
          <h3>Feature Flags</h3>
          <p>{Object.keys(data.featureFlags.flags).length === 0 ? "None" : null}</p>
          {Object.entries(data.featureFlags.flags).map(([key, value]) => (
            <p key={key}>
              {key}: {String(value)}
            </p>
          ))}
          <h3>Prompt Assignments</h3>
          <p>{data.promptAssignments.length === 0 ? "No tenant-specific assignments" : null}</p>
          {data.promptAssignments.map((entry) => (
            <p key={entry.promptKey}>
              {entry.promptKey}: {entry.activeVersion}
            </p>
          ))}
          <h3>Recent Errors</h3>
          <p>{(data.recentErrors ?? []).length === 0 ? "No recent errors" : null}</p>
          {(data.recentErrors ?? []).map((entry, index) => (
            <p key={`${entry.timestamp}-${index}`}>
              [{entry.timestamp}] {entry.requestType} {entry.errorMessage ?? ""}
            </p>
          ))}
        </article>
      ) : (
        <p>Loading tenant detail...</p>
      )}
    </section>
  );
}
