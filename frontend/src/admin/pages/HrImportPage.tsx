import { ChangeEvent, useEffect, useState } from "react";
import {
  formatAdminDate,
  getStatusTone,
  listHrImportJobs,
  loadHrImportPreview,
  processHrImportJob,
  uploadHrImportFile,
  type ActivationDeliverySummary,
  type HrImportJob,
  type HrImportRow
} from "../api/adminExperienceApi";

const importSteps = ["Upload", "Preview", "Validate", "Process"] as const;

type ImportStep = (typeof importSteps)[number];

export function HrImportPage() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("Upload");
  const [jobs, setJobs] = useState<HrImportJob[]>([]);
  const [activeJob, setActiveJob] = useState<HrImportJob | null>(null);
  const [rows, setRows] = useState<HrImportRow[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activationDeliveries, setActivationDeliveries] = useState<ActivationDeliverySummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listHrImportJobs()
      .then(async (result) => {
        if (cancelled) return;
        const sortedJobs = [...result.jobs].sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
        setJobs(sortedJobs);
        const latest = sortedJobs[0];
        if (latest) {
          const preview = await loadHrImportPreview(latest.id);
          if (!cancelled) {
            setActiveJob(preview.job);
            setRows(preview.rows);
            setCurrentStep(preview.job.status === "completed" ? "Process" : "Preview");
          }
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Failed to load HR import jobs");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const errors = rows.filter((row) => row.validationStatus === "invalid").length;
  const warnings = rows.filter((row) => row.validationStatus === "warning").length;
  const readyRows = rows.filter((row) => row.validationStatus === "valid").length;
  const reviewedRows = readyRows + warnings;
  const canProcess = Boolean(activeJob) && rows.length > 0 && errors === 0 && !processing;
  const processBlockReason = !activeJob
    ? "Upload a spreadsheet first."
    : rows.length === 0
      ? "No rows are ready to process."
      : errors > 0
        ? "Fix blocking errors before provisioning users."
        : warnings > 0
          ? "Warnings will be processed. Review them before continuing."
          : "All valid rows can be provisioned.";

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setMessage(null);
    setError(null);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await uploadHrImportFile(selectedFile);
      setActiveJob(result.job);
      setRows(result.rows);
      setJobs((current) => [result.job, ...current.filter((job) => job.id !== result.job.id)]);
      setCurrentStep("Preview");
      setMessage("Dry-run preview created. Resolve validation errors before processing.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload HR import file");
    } finally {
      setUploading(false);
    }
  }

  async function handleProcess() {
    if (!activeJob || errors > 0) return;
    setProcessing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await processHrImportJob(activeJob.id);
      const preview = await loadHrImportPreview(result.job.id);
      setActiveJob(preview.job);
      setRows(preview.rows);
      setActivationDeliveries(result.activationDeliveries ?? []);
      setCurrentStep("Process");
      setMessage(`Import processed: ${result.job.successfulRows} successful, ${result.job.failedRows} failed.`);
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : "Failed to process HR import");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) return <p className="admin-loading">Loading HR import workspace...</p>;

  return (
    <section className="admin-page-stack">
      <div className="admin-page-heading">
        <span className="eyebrow">HR import</span>
        <h1>Upload, validate, then provision safely</h1>
        <p>Imports run through dry-run preview before processing so invalid rows do not create broken users.</p>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      {message ? <p className="admin-success-text">{message}</p> : null}

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
            <strong>{selectedFile ? selectedFile.name : "Choose HR spreadsheet"}</strong>
            <span>Nothing is provisioned until you review the preview and press Process valid rows.</span>
            <input type="file" accept=".csv,.xlsx" aria-label="Upload HR spreadsheet" onChange={handleFileChange} />
            <button type="button" className="admin-button admin-button--ghost" disabled={!selectedFile || uploading} onClick={handleUpload}>
              {uploading ? "Uploading..." : "Upload and preview"}
            </button>
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Validation summary</h2>
              <p>Resolve errors before processing. Warnings require admin review.</p>
            </div>
          </div>
          {activeJob ? <p className="helper-text">Latest job: {activeJob.fileName} - {activeJob.status} - {formatAdminDate(activeJob.startedAt)}</p> : null}
          <div className={`admin-import-decision ${errors > 0 ? "admin-import-decision--danger" : warnings > 0 ? "admin-import-decision--warning" : "admin-import-decision--success"}`}>
            <strong>{errors > 0 ? "Not ready to process" : activeJob ? "Ready for admin decision" : "Waiting for upload"}</strong>
            <span>{processBlockReason}</span>
          </div>
          <div className="admin-summary-list">
            <div><strong>{reviewedRows}</strong><span>Rows eligible</span></div>
            <div><strong>{warnings}</strong><span>Warnings or duplicates</span></div>
            <div><strong>{errors}</strong><span>Blocking errors</span></div>
          </div>
          <div className="admin-action-row">
            <button type="button" className="admin-button admin-button--ghost" disabled={!activeJob} onClick={() => activeJob && loadHrImportPreview(activeJob.id).then((preview) => { setActiveJob(preview.job); setRows(preview.rows); setMessage("Dry-run preview refreshed."); }).catch((previewError) => setError(previewError instanceof Error ? previewError.message : "Failed to refresh preview"))}>
              Refresh dry-run preview
            </button>
            <button type="button" className="admin-button" disabled={!canProcess} onClick={handleProcess}>
              {processing ? "Processing..." : "Process valid rows"}
            </button>
          </div>
          {activationDeliveries.length > 0 ? (
            <div className="admin-delivery-summary">
              <strong>Activation delivery</strong>
              {activationDeliveries.slice(0, 3).map((delivery) => (
                <p key={delivery.userId}>
                  <span className={`admin-badge admin-badge--${delivery.status === "failed" || delivery.status === "not_configured" ? "danger" : delivery.status === "queued" ? "warning" : "success"}`}>
                    {delivery.status}
                  </span>{" "}
                  {delivery.channel} {delivery.destination ? `to ${delivery.destination}` : ""} - {delivery.message}
                </p>
              ))}
            </div>
          ) : null}
        </article>

        <article className="admin-panel admin-panel--wide admin-panel--table">
          <div className="admin-panel__header">
            <div>
              <h2>Import preview</h2>
              <p>Review exactly who will be created, skipped, or blocked before provisioning.</p>
            </div>
            <span className="admin-badge admin-badge--warning">Dry-run</span>
          </div>
          {rows.length === 0 ? (
            <p className="admin-empty-state">No import rows to preview. Upload a CSV or XLSX file to start.</p>
          ) : (
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
                  {rows.map((row) => {
                    const mapped = row.mappedData ?? {};
                    const firstName = typeof mapped.firstName === "string" ? mapped.firstName : "";
                    const lastName = typeof mapped.lastName === "string" ? mapped.lastName : "";
                    const messages = [...row.errorMessages, ...row.warningMessages];
                    return (
                      <tr key={row.id}>
                        <td>{row.rowNumber}</td>
                        <td>{typeof mapped.employeeCode === "string" && mapped.employeeCode ? mapped.employeeCode : "Missing"}</td>
                        <td>{`${firstName} ${lastName}`.trim() || "Not mapped"}</td>
                        <td>{typeof mapped.department === "string" ? mapped.department : "Not mapped"}</td>
                        <td>{typeof mapped.roleName === "string" ? mapped.roleName : "Not mapped"}</td>
                        <td>
                          <span className={`admin-badge admin-badge--${getStatusTone(row.validationStatus)}`}>{row.validationStatus}</span>
                          <p className="admin-table-note">{messages[0] ?? row.provisioningStatus}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

