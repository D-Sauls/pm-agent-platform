import { tenantSettings } from "../data/adminExperienceData";

export function TenantSettingsPage() {
  return (
    <section className="admin-page-stack">
      <div className="admin-page-heading">
        <span className="eyebrow">Tenant settings</span>
        <h1>Branding, security, and download rules</h1>
        <p>Settings are grouped to keep tenant configuration clear without exposing employee-facing internals.</p>
      </div>

      <div className="admin-panel-grid">
        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Branding</h2>
              <p>Client-branded employee experience without code forks.</p>
            </div>
          </div>
          <dl className="admin-detail-list">
            <div><dt>Tenant name</dt><dd>{tenantSettings.tenantName}</dd></div>
            <div><dt>Employee app name</dt><dd>{tenantSettings.appName}</dd></div>
            <div><dt>Brand color</dt><dd><span className="admin-color-swatch" style={{ background: tenantSettings.brandColor }} />{tenantSettings.brandColor}</dd></div>
          </dl>
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Security policies</h2>
              <p>Activation and access rules are tenant-level controls.</p>
            </div>
          </div>
          <dl className="admin-detail-list">
            <div><dt>Activation mode</dt><dd>{tenantSettings.activationMode}</dd></div>
            <div><dt>Access policy</dt><dd>{tenantSettings.accessPolicy}</dd></div>
            <div><dt>Evidence retention</dt><dd>{tenantSettings.evidenceRetention}</dd></div>
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
              <strong>{tenantSettings.downloadPolicy}</strong>
              <p>Employee devices cache assigned course and policy assets only after authenticated access.</p>
            </section>
            <section>
              <span className="eyebrow">Compliance due window</span>
              <strong>{tenantSettings.complianceDueDays} days</strong>
              <p>Due dates are stable once assigned and used for overdue reporting.</p>
            </section>
          </div>
        </article>
      </div>
    </section>
  );
}
