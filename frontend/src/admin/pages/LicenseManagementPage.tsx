import { useEffect, useState } from "react";
import { getAdminJson, postAdminJson } from "../../api/adminClient";

interface LicenseVm {
  tenantId: string;
  status: string;
  planType: string;
  trialMode: boolean;
  expiryDate?: string;
  latestValidationResult: string;
}

export function LicenseManagementPage() {
  const [rows, setRows] = useState<LicenseVm[]>([]);

  async function load() {
    const result = await getAdminJson<LicenseVm[]>("/licenses");
    setRows(result);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section>
      <h2>License Management</h2>
      {rows.length === 0 ? <p>No licenses found.</p> : null}
      {rows.map((row) => (
        <article key={row.tenantId} style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <p>
            <strong>{row.tenantId}</strong> ({row.status}) - validation: {row.latestValidationResult}
          </p>
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
