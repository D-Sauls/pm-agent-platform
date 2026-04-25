import { useState } from "react";
import { getEmployeeById, getStatusLabel, getStatusTone } from "../data/adminExperienceData";

interface EmployeeDetailPageProps {
  employeeId: string;
  onBack: () => void;
}

export function EmployeeDetailPage({ employeeId, onBack }: EmployeeDetailPageProps) {
  const employee = getEmployeeById(employeeId);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideMessage, setOverrideMessage] = useState<string | null>(null);

  function handleOverrideRequest() {
    if (!overrideReason.trim()) return;
    setOverrideMessage("Override request staged with required reason. Evidence remains read-only and historical records are not edited.");
  }

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
          <strong>{employee.lastActivity}</strong>
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
          <div className="admin-list-stack">
            {employee.assignedCourses.map((course) => (
              <section key={course.title} className="admin-list-item">
                <div>
                  <strong>{course.title}</strong>
                  <small>{course.progress}% complete</small>
                </div>
                <span className={`admin-badge admin-badge--${getStatusTone(course.status)}`}>{course.status}</span>
              </section>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Assigned Policies</h2>
              <p>Version and effective date remain explicit for compliance review.</p>
            </div>
          </div>
          <div className="admin-list-stack">
            {employee.assignedPolicies.map((policy) => (
              <section key={`${policy.title}-${policy.version}`} className="admin-list-item">
                <div>
                  <strong>{policy.title}</strong>
                  <small>{policy.version} - effective {policy.effectiveDate}</small>
                </div>
                <span className={`admin-badge admin-badge--${getStatusTone(policy.status === "acknowledged" ? "compliant" : policy.status)}`}>{policy.status}</span>
              </section>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <h2>Acknowledgement Timeline</h2>
              <p>Version-aware evidence history. Historical evidence is read-only.</p>
            </div>
            <span className="admin-badge admin-badge--neutral">Read-only</span>
          </div>
          <ol className="admin-timeline">
            {employee.acknowledgementTimeline.map((event) => (
              <li key={`${event.date}-${event.title}-${event.version}`} className="admin-timeline__item">
                <span>{event.date}</span>
                <strong>{event.event}</strong>
                <p>{event.title} {event.version} - actor: {event.actor}</p>
              </li>
            ))}
          </ol>
        </article>

        <article className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <h2>Append-only Audit Log</h2>
              <p>Admin actions create new audit entries. Existing evidence is never edited.</p>
            </div>
          </div>
          <ol className="admin-timeline admin-timeline--compact">
            {employee.auditLog.map((event) => (
              <li key={`${event.date}-${event.event}`} className="admin-timeline__item admin-timeline__item--neutral">
                <span>{event.date}</span>
                <strong>{event.event}</strong>
                <p>Actor: {event.actor}{event.reason ? ` - Reason: ${event.reason}` : ""}</p>
              </li>
            ))}
          </ol>

          <div className="admin-override-box">
            <h3>Override action</h3>
            <p>Overrides require a reason and must append an audit entry. They do not modify historical evidence records.</p>
            <textarea
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Required reason before an override can be submitted"
              rows={3}
            />
            <button type="button" className="admin-button" disabled={!overrideReason.trim()} onClick={handleOverrideRequest}>
              Confirm override with audit reason
            </button>
            {overrideMessage ? <p className="admin-success-text">{overrideMessage}</p> : null}
          </div>
        </article>
      </div>
    </section>
  );
}
