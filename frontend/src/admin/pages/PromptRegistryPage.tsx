import { useEffect, useState } from "react";
import { getAdminJson, postAdminJson } from "../../api/adminClient";

interface PromptVersionVm {
  promptKey: string;
  version: string;
  createdAt: string;
  isDefault: boolean;
}

export function PromptRegistryPage() {
  const [promptKey, setPromptKey] = useState("weekly_report");
  const [tenantId, setTenantId] = useState("tenant-acme");
  const [versions, setVersions] = useState<PromptVersionVm[]>([]);

  async function load() {
    const data = await getAdminJson<PromptVersionVm[]>(`/prompts/${promptKey}/versions`);
    setVersions(data);
  }

  useEffect(() => {
    void load();
  }, [promptKey]);

  return (
    <section>
      <h2>Prompt Registry</h2>
      <input value={promptKey} onChange={(e) => setPromptKey(e.target.value)} />
      {versions.length === 0 ? <p>No versions found.</p> : null}
      {versions.map((version) => (
        <article key={version.version} style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12, marginTop: 8 }}>
          <p>
            {version.promptKey}:{version.version} {version.isDefault ? "(default)" : ""}
          </p>
          <button
            onClick={async () => {
              await postAdminJson(`/prompts/${promptKey}/default`, { version: version.version });
              await load();
            }}
          >
            Mark Default
          </button>{" "}
          <button
            onClick={async () => {
              await postAdminJson(`/prompts/${tenantId}/assign`, {
                promptKey,
                version: version.version
              });
            }}
          >
            Assign to Tenant
          </button>{" "}
          <button
            onClick={async () => {
              await postAdminJson(`/prompts/${tenantId}/rollback`, {
                promptKey,
                targetVersion: version.version
              });
            }}
          >
            Rollback Tenant
          </button>
        </article>
      ))}
    </section>
  );
}
