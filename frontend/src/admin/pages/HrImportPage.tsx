import { useState } from "react";
import { getStatusTone, importPreviewRows } from "../data/adminExperienceData";

const importSteps = ["Upload", "Preview", "Validate", "Process"] as const;

export function HrImportPage() {
  const [currentStep, setCurrentStep] = useState<(typeof importSteps)[number]>("Preview");
  const errors = importPreviewRows.filter((row) => row.status === "error").length;
  const warnings = importPreviewRows.filter((row) => row.status === "warning" || row.status === "duplicate").length;
  const readyRows = importPreviewRows.filter((row) => row.status === "ready").length;

  return (
    <section className="admin-page-stack">
      <div className="admin-page-heading">
        <span className="eyebrow">HR import</span>
        <h1>Upload, validate, then provision safely</h1>
        <p>Imports run through dry-run preview before processing so invalid rows do not create broken users.</p>
      </div>

      <div className="admin-import-stepper" aria-label="HR import steps">
        {importSteps.map((step) => (
          <button
            key={step}
            type="button"
            className={currentStep === step ? "admin-step admin-step--active" : "admin-step"}
            onClick={() => setCurrentStep(step)}
          >
            {step}
          </button>
        ))}
      </div>

      <div className="admin-panel-grid">
        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Upload spreadsheet</h2>
              <p>Accepted formats: CSV and XLSX. Employee ID is used as the username where configured.</p>
            </div>
          </div>
          <div className="admin-upload-box">
            <strong>Drop HR spreadsheet here</strong>
            <span>Dry-run preview is enabled before any provisioning action.</span>
            <button type="button" className="admin-button admin-button--ghost">Choose file</button>
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Validation summary</h2>
              <p>Resolve errors before processing. Warnings require admin review.</p>
            </div>
          </div>
          <div className="admin-summary-list">
            <div><strong>{readyRows}</strong><span>Rows ready</span></div>
            <div><strong>{warnings}</strong><span>Warnings or duplicates</span></div>
            <div><strong>{errors}</strong><span>Blocking errors</span></div>
          </div>
          <div className="admin-action-row">
            <button type="button" className="admin-button admin-button--ghost">Run dry-run preview</button>
            <button type="button" className="admin-button" disabled={errors > 0}>Process valid rows</button>
          </div>
        </article>

        <article className="admin-panel admin-panel--wide admin-panel--table">
          <div className="admin-panel__header">
            <div>
              <h2>Import preview</h2>
              <p>Row-level outcomes show errors, warnings, duplicate handling, and mapped role assignment.</p>
            </div>
            <span className="admin-badge admin-badge--warning">Dry-run</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {importPreviewRows.map((row) => (
                  <tr key={row.row}>
                    <td>{row.row}</td>
                    <td>{row.employeeCode || "Missing"}</td>
                    <td>{row.name}</td>
                    <td>{row.department}</td>
                    <td>{row.role}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${getStatusTone(row.status)}`}>{row.status}</span>
                      <p className="admin-table-note">{row.message}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
