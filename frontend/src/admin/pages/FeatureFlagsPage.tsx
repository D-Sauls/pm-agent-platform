import { useEffect, useState } from "react";
import { getAdminJson, postAdminJson } from "../../api/adminClient";

interface FeatureFlagVm {
  key: string;
  description: string;
  defaultEnabled: boolean;
}

export function FeatureFlagsPage() {
  const [tenantId, setTenantId] = useState("tenant-acme");
  const [globalFlags, setGlobalFlags] = useState<FeatureFlagVm[]>([]);
  const [tenantFlags, setTenantFlags] = useState<Record<string, boolean>>({});

  async function load() {
    const global = await getAdminJson<{ globalFlags: FeatureFlagVm[] }>("/feature-flags");
    const tenant = await getAdminJson<{ tenantId: string; flags: Record<string, boolean> }>(
      `/feature-flags/${tenantId}`
    );
    setGlobalFlags(global.globalFlags);
    setTenantFlags(tenant.flags);
  }

  useEffect(() => {
    void load();
  }, [tenantId]);

  return (
    <section>
      <h2>Feature Flags</h2>
      <label>
        Tenant:
        <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
      </label>
      {globalFlags.map((flag) => (
        <article key={flag.key} style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12, marginTop: 8 }}>
          <p>
            <strong>{flag.key}</strong> - {flag.description}
          </p>
          <p>Default: {String(flag.defaultEnabled)} | Tenant: {String(tenantFlags[flag.key])}</p>
          <button
            onClick={async () => {
              await postAdminJson(`/feature-flags/${tenantId}`, {
                flagKey: flag.key,
                enabled: !tenantFlags[flag.key]
              });
              await load();
            }}
          >
            Toggle Tenant Flag
          </button>
        </article>
      ))}
    </section>
  );
}
