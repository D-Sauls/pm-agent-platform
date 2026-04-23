import { useEffect, useState } from "react";
import { getAdminJson, postAdminJson } from "../../api/adminClient";

interface FeatureFlagVm {
  key: string;
  description: string;
  defaultEnabled: boolean;
}

interface FeatureFlagsPageProps {
  adminRole: "superadmin" | "supportadmin" | "readonlyadmin";
}

export function FeatureFlagsPage({ adminRole }: FeatureFlagsPageProps) {
  const [tenantId, setTenantId] = useState("tenant-acme");
  const [globalFlags, setGlobalFlags] = useState<FeatureFlagVm[]>([]);
  const [tenantFlags, setTenantFlags] = useState<Record<string, boolean>>({});
  const [effectiveFlags, setEffectiveFlags] = useState<Record<string, boolean>>({});

  async function load() {
    const global = await getAdminJson<{ globalFlags: FeatureFlagVm[] }>("/feature-flags");
    const tenant = await getAdminJson<{
      tenantId: string;
      flags: Record<string, boolean>;
      effectiveFlags: Record<string, boolean>;
    }>(
      `/feature-flags/${tenantId}`
    );
    setGlobalFlags(global.globalFlags);
    setTenantFlags(tenant.flags);
    setEffectiveFlags(tenant.effectiveFlags);
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
      <div className="admin-stack admin-stack--spaced">
        {globalFlags.map((flag) => (
          <article key={flag.key} className="admin-card">
            <p>
              <strong>{flag.key}</strong> - {flag.description}
            </p>
            <p>
              Default: {String(flag.defaultEnabled)} | Tenant Override: {String(tenantFlags[flag.key])} |
              Effective: {String(effectiveFlags[flag.key])}
            </p>
            {adminRole === "superadmin" ? (
              <>
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
                </button>{" "}
                <button
                  onClick={async () => {
                    await postAdminJson(`/feature-flags/default/${flag.key}`, {
                      enabled: !flag.defaultEnabled
                    });
                    await load();
                  }}
                >
                  Toggle Global Default
                </button>
              </>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
