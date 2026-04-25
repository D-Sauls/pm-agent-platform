import { useEffect, useMemo, useState } from "react";
import {
  createAdminOverride,
  formatAdminDate,
  getStatusLabel,
  getStatusTone,
  loadAdminEmployeeDetail,
  type AdminEmployeeDetail
} from "../api/adminExperienceApi";

interface EmployeeDetailPageProps {
  employeeId: string;
  onBack: () => void;
}

export function EmployeeDetailPage({ employeeId, onBack }: EmployeeDetailPageProps) {
  const [employee, setEmployee] = useState<AdminEmployeeDetail | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideSubjectId, setOverrideSubjectId] = useState("");
  const [overrideMessage, setOverrideMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingOverride, setSavingOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadAdminEmployeeDetail(employeeId)
      .then((result) => {
        if (cancelled) return;
        setEmployee(result.employee);
        setOverrideSubjectId(result.employee.assignedPolicies[0]?.id ?? result.employee.assignedCourses[0]?.id ?? "");
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Failed to load employee detail");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const overrideSubjectType = useMemo(() => {
    if (!employee) return "policy" as const;
    return employee.assignedPolicies.some((policy) => policy.id === overrideSubjectId) ? "policy" as const : "course" as const;
  }, [employee, overrideSubjectId]);

  async function handleOverrideRequest() {
    if (!employee || !overrideReason.trim() || !overrideSubjectId) return;
    setSavingOverride(true);
    setError(null);
    setOverrideMessage(null);
    try {
      const result = await createAdminOverride(employee.id, {
        subjectType: overrideSubjectType,
        subjectId: overrideSubjectId,
        reason: overrideReason.trim()
      });
      setEmployee(result.employee);
      setOverrideReason("");
      setOverrideMessage("Override recorded with an audit reason. Historical evidence remains read-only.");
    } catch (overrideError) {
      setError(overrideError instanceof Error ? overrideError.message : "Failed to record override");
    } finally {
      setSavingOverride(false);
    }
  }

  if (loading) return <p className="admin-loading">Loading employee evidence...</p>;
  if (error && !employee) return <p className="admin-error">{error}</p>;
  if (!employee) return <p className="admin-empty-state">Employee detail is not available.</p>;

  const overrideSubjects = [
    ...employee.assignedPolicies.map((policy) => ({ id: policy.id, label: `${policy.title} (${policy.version})`, type: "policy" })),
    ...employee.assignedCourses.map((course) => ({ id: course.id, label: `${course.title} (${course.version})`, type: "course" }))
  ];

  return (
    <section className="admin-page-stack">
      <button type="button" className="admin-button admin-button--ghost admin-button--fit" onClick={onBack}>
        Back to employees
      </button>

      <div className="admin-page-heading admin-page-heading--split">
        <div>
          <span className="eyebrow">Employee detail</span>
          <h1>{employee.name}</h1>
          <p>{employee.employeeCode} - {employee.department} - {employee.role}</p>
        </div>
        <span className={`admin-badge admin-badge--${getStatusTone(employee.complianceStatus)}`}>
          {getStatusLabel(employee.complianceStatus)}
        </span>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-kpi-grid admin-kpi-grid--compact">
        <article className="admin-kpi-card">
          <span>Onboarding progress</span>
          <strong>{employee.onboardingProgress}%</strong>
          <small>Assigned path completion</small>
        </article>
        <article className="admin-kpi-card admin-kpi-card--danger">
          <span>Overdue items</span>
          <strong>{employee.overdueItems}</strong>
          <small>Required follow-up count</small>
        </article>
        <article className="admin-kpi-card">
          <span>Last activity</span>
          <strong>{formatAdminDate(employee.lastActivity)}</strong>
          <small>Most recent event</small>
        </article>
      </div>

      <div className="admin-panel-grid">
        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Assigned Courses</h2>
              <p>Course status is read from durable onboarding assignments.</p>
            </div>
          </div>
          {employee.assignedCourses.length === 0 ? (
            <p className="admin-empty-state">No assigned courses found for this employee.</p>
          ) : (
            <div className="admin-list-stack">
              {employee.assignedCourses.map((course) => (
                <section key={course.id} className="admin-list-item">
                  <div>
                    <strong>{course.title}</strong>
                    <small>{course.progress}% complete - {course.version}</small>
                  </div>
                  <span className={`admin-badge admin-badge--${getStatusTone(course.status)}`}>{course.status}</span>
                </section>
              ))}
            </div>
          )}
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Assigned Policies</h2>
              <p>Version and effective date remain explicit for compliance review.</p>
            </div>
          </div>
          {employee.assignedPolicies.length === 0 ? (
            <p className="admin-empty-state">No assigned policies found for this employee.</p>
          ) : (
            <div className="admin-list-stack">
              {employee.assignedPolicies.map((policy) => (
                <section key={`${policy.id}-${policy.version}`} className="admin-list-item">
                  <div>
                    <strong>{policy.title}</strong>
                    <small>{policy.version} - effective {formatAdminDate(policy.effectiveDate)}</small>
                  </div>
                  <span className={`admin-badge admin-badge--${getStatusTone(policy.status === "acknowledged" ? "compliant" : policy.status)}`}>{policy.status}</span>
                </section>
              ))}
            </div>
          )}
        </article>

        <article className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <h2>Acknowledgement Timeline</h2>
              <p>Version-aware evidence history. Historical evidence is read-only.</p>
            </div>
            <span className="admin-badge admin-badge--neutral">Read-only</span>
          </div>
          {employee.acknowledgementTimeline.length === 0 ? (
            <p className="admin-empty-state">No acknowledgement evidence has been recorded for this employee.</p>
          ) : (
            <ol className="admin-timeline">
              {employee.acknowledgementTimeline.map((event) => (
                <li key={event.id} className="admin-timeline__item">
                  <span>{formatAdminDate(event.date)}</span>
                  <strong>{event.event}</strong>
                  <p>{event.title} {event.version} - actor: {event.actor}</p>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <h2>Append-only Audit Log</h2>
              <p>Admin actions create new audit entries. Existing evidence is never edited.</p>
            </div>
          </div>
          {employee.auditLog.length === 0 ? (
            <p className="admin-empty-state">No audit events have been recorded for this employee.</p>
          ) : (
            <ol className="admin-timeline admin-timeline--compact">
              {employee.auditLog.map((event) => (
                <li key={event.id} className="admin-timeline__item admin-timeline__item--neutral">
                  <span>{formatAdminDate(event.date)}</span>
                  <strong>{event.event}</strong>
                  <p>Actor: {event.actor}{event.reason ? ` - Reason: ${event.reason}` : ""}</p>
                </li>
              ))}
            </ol>
          )}

          <div className="admin-override-box">
            <h3>Override action</h3>
            <p>Overrides require a reason and append an audit entry. Historical evidence records stay read-only.</p>
            <select value={overrideSubjectId} onChange={(event) => setOverrideSubjectId(event.target.value)} disabled={overrideSubjects.length === 0}>
              {overrideSubjects.length === 0 ? <option value="">No assigned subject available</option> : null}
              {overrideSubjects.map((subject) => <option key={`${subject.type}-${subject.id}`} value={subject.id}>{subject.label}</option>)}
            </select>
            <textarea
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Required reason before an override can be submitted"
              rows={3}
            />
            <button type="button" className="admin-button" disabled={!overrideReason.trim() || !overrideSubjectId || savingOverride} onClick={handleOverrideRequest}>
              {savingOverride ? "Recording override..." : "Confirm override with audit reason"}
            </button>
            {overrideMessage ? <p className="admin-success-text">{overrideMessage}</p> : null}
          </div>
        </article>
      </div>
    </section>
  );
}
