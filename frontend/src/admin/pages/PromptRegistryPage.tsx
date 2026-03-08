import { useEffect, useState } from "react";
import { getAdminJson, postAdminJson } from "../../api/adminClient";

interface PromptVersionVm {
  promptKey: string;
  version: string;
  createdAt: string;
  isDefault: boolean;
}

interface PromptRegistryPageProps {
  adminRole: "superadmin" | "supportadmin" | "readonlyadmin";
}

export function PromptRegistryPage({ adminRole }: PromptRegistryPageProps) {
  const [promptKey, setPromptKey] = useState("weekly_report");
  const [tenantId, setTenantId] = useState("tenant-acme");
  const [versions, setVersions] = useState<PromptVersionVm[]>([]);
  const [promptKeys, setPromptKeys] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Array<{ promptKey: string; activeVersion: string }>>([]);

  async function load() {
    const keys = await getAdminJson<{ promptKeys: string[] }>("/prompts");
    setPromptKeys(keys.promptKeys);
    const data = await getAdminJson<PromptVersionVm[]>(`/prompts/${promptKey}/versions`);
    const tenantAssignments = await getAdminJson<{
      assignments: Array<{ promptKey: string; activeVersion: string }>;
    }>(`/prompts/tenant/${tenantId}`);
    setVersions(data);
    setAssignments(tenantAssignments.assignments);
  }

  useEffect(() => {
    void load();
  }, [promptKey, tenantId]);

  return (
    <section>
      <h2>Prompt Registry</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <select value={promptKey} onChange={(e) => setPromptKey(e.target.value)}>
          {promptKeys.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Tenant id" />
      </div>
      {versions.length === 0 ? <p>No versions found.</p> : null}
      {versions.map((version) => (
        <article key={version.version} style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12, marginTop: 8 }}>
          <p>
            {version.promptKey}:{version.version} {version.isDefault ? "(default)" : ""}
          </p>
          {adminRole === "superadmin" ? (
            <>
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
                  await load();
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
                  await load();
                }}
              >
                Rollback Tenant
              </button>
            </>
          ) : null}
        </article>
      ))}
      <article style={{ border: "1px solid #d8d8d8", borderRadius: 8, padding: 12, marginTop: 16 }}>
        <h3>Tenant Assignments</h3>
        {assignments.length === 0 ? <p>No assignments for this tenant.</p> : null}
        {assignments.map((row) => (
          <p key={row.promptKey}>
            {row.promptKey}: {row.activeVersion}
          </p>
        ))}
      </article>
    </section>
  );
}
