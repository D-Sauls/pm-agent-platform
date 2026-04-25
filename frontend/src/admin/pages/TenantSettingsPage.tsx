import { useEffect, useState } from "react";
import { loadTenantSettings, saveTenantSettings, type AdminTenantSettings } from "../api/adminExperienceApi";

export function TenantSettingsPage() {
  const [settings, setSettings] = useState<AdminTenantSettings | null>(null);
  const [draft, setDraft] = useState<AdminTenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadTenantSettings()
      .then((result) => {
        if (cancelled) return;
        setSettings(result);
        setDraft(result);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Failed to load tenant settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await saveTenantSettings(draft);
      setSettings(saved);
      setDraft(saved);
      setMessage("Tenant settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save tenant settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="admin-loading">Loading tenant settings...</p>;
  if (error && !draft) return <p className="admin-error">{error}</p>;
  if (!draft || !settings) return <p className="admin-empty-state">Tenant settings are not available.</p>;

  return (
    <section className="admin-page-stack">
      <div className="admin-page-heading">
        <span className="eyebrow">Tenant settings</span>
        <h1>Branding, security, and download rules</h1>
        <p>Settings are grouped to keep tenant configuration clear without exposing employee-facing internals.</p>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      {message ? <p className="admin-success-text">{message}</p> : null}

      <div className="admin-panel-grid">
        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Branding</h2>
              <p>Client-branded employee experience without code forks.</p>
            </div>
          </div>
          <div className="admin-settings-form">
            <label>
              Tenant name
              <input value={draft.tenantName} onChange={(event) => setDraft({ ...draft, tenantName: event.target.value })} />
            </label>
            <label>
              Employee app name
              <input value={draft.appName} onChange={(event) => setDraft({ ...draft, appName: event.target.value })} />
            </label>
            <label>
              Brand color
              <input value={draft.brandColor} onChange={(event) => setDraft({ ...draft, brandColor: event.target.value })} />
            </label>
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Security policies</h2>
              <p>Activation and access rules are tenant-level controls.</p>
            </div>
          </div>
          <dl className="admin-detail-list">
            <div><dt>Activation mode</dt><dd>{settings.activationMode}</dd></div>
            <div><dt>Access policy</dt><dd>{settings.accessPolicy}</dd></div>
            <div><dt>Evidence retention</dt><dd>{settings.evidenceRetention}</dd></div>
          </dl>
        </article>

        <article className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <h2>Download and compliance rules</h2>
              <p>Offline access follows tenant download policy and only applies to assigned content.</p>
            </div>
          </div>
          <div className="admin-settings-grid">
            <section>
              <span className="eyebrow">Download rule</span>
              <select value={draft.downloadPolicy} onChange={(event) => setDraft({ ...draft, downloadPolicy: event.target.value as AdminTenantSettings["downloadPolicy"] })}>
                <option value="allow_anywhere">Allow anywhere</option>
                <option value="authenticated_only">Authenticated only</option>
                <option value="vpn_only">VPN only</option>
                <option value="office_ip_only">Office IP only</option>
              </select>
              <p>Employee devices cache assigned course and policy assets only after authenticated access.</p>
            </section>
            <section>
              <span className="eyebrow">Compliance due window</span>
              <input
                type="number"
                min={1}
                value={draft.complianceDueDays}
                onChange={(event) => setDraft({ ...draft, complianceDueDays: Number(event.target.value) })}
              />
              <p>Due dates are stable once assigned and used for overdue reporting.</p>
            </section>
          </div>
          <button type="button" className="admin-button admin-button--fit" disabled={saving} onClick={handleSave}>
            {saving ? "Saving settings..." : "Save tenant settings"}
          </button>
        </article>
      </div>
    </section>
  );
}
