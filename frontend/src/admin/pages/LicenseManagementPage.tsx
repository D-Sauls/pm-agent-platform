import { useEffect, useState } from "react";
import { getAdminJson, postAdminJson } from "../../api/adminClient";

interface LicenseVm {
  tenantId: string;
  status: string;
  planType: string;
  trialMode: boolean;
  expiryDate?: string;
  latestValidationResult: string;
  updatedAt?: string;
}

interface LicenseManagementPageProps {
  adminRole: "superadmin" | "supportadmin" | "readonlyadmin";
}

export function LicenseManagementPage({ adminRole }: LicenseManagementPageProps) {
  const [rows, setRows] = useState<LicenseVm[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const result = await getAdminJson<LicenseVm[]>("/licenses");
      setRows(result);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load licenses");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section>
      <h2>License Management</h2>
      {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}
      {rows.length === 0 ? <p>No licenses found.</p> : null}
      {rows.map((row) => (
        <article key={row.tenantId} style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <p>
            <strong>{row.tenantId}</strong> ({row.status}) - validation: {row.latestValidationResult}
          </p>
          <p>Trial mode: {String(row.trialMode)}</p>
          <p>Expiry: {row.expiryDate ?? "n/a"}</p>
          <p>Last update: {row.updatedAt ?? "n/a"}</p>
          {adminRole === "superadmin" ? (
            <>
              <button
                onClick={async () => {
                  await postAdminJson(`/licenses/${row.tenantId}/activate`);
                  await load();
                }}
              >
                Activate
              </button>{" "}
              <button
                onClick={async () => {
                  await postAdminJson(`/licenses/${row.tenantId}/suspend`);
                  await load();
                }}
              >
                Suspend
              </button>{" "}
              <button
                onClick={async () => {
                  await postAdminJson(`/licenses/${row.tenantId}/trial`, {
                    enabled: !row.trialMode
                  });
                  await load();
                }}
              >
                Toggle Trial
              </button>{" "}
              <button
                onClick={async () => {
                  const expiryDate = new Date(Date.now() + 30 * 24 * 3600_000).toISOString();
                  await postAdminJson(`/licenses/${row.tenantId}/expiry`, { expiryDate });
                  await load();
                }}
              >
                Set +30d Expiry
              </button>{" "}
            </>
          ) : null}
          <button
            onClick={async () => {
              await postAdminJson(`/licenses/${row.tenantId}/validate`);
              await load();
            }}
          >
            Validate
          </button>
        </article>
      ))}
    </section>
  );
}
