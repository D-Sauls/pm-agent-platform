import { courses, getStatusTone, policies } from "../data/adminExperienceData";

export function ContentManagementPage() {
  return (
    <section className="admin-page-stack">
      <div className="admin-page-heading">
        <span className="eyebrow">Content management</span>
        <h1>Policy and course versions</h1>
        <p>Version publishing is intentional because policy updates can trigger re-acknowledgement and reassignment impact.</p>
      </div>

      <div className="admin-panel-grid">
        <article className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <h2>Policy Management</h2>
              <p>Active version, acknowledgement coverage, and re-ack impact are visible before publishing.</p>
            </div>
            <button type="button" className="admin-button admin-button--danger">Publish new version</button>
          </div>
          <div className="admin-content-list">
            {policies.map((policy) => (
              <section key={policy.id} className="admin-content-item">
                <div className="admin-content-item__summary">
                  <div>
                    <h3>{policy.title}</h3>
                    <p>Active {policy.activeVersion} - effective {policy.effectiveDate}</p>
                  </div>
                  <span className={`admin-badge admin-badge--${getStatusTone(policy.status)}`}>{policy.status}</span>
                </div>
                <div className="admin-summary-list admin-summary-list--compact">
                  <div><strong>{policy.acknowledgedCount}/{policy.assignedCount}</strong><span>Acknowledged</span></div>
                  <div><strong>{policy.reackImpact}</strong><span>Re-ack impact</span></div>
                </div>
                <div className="admin-version-list">
                  {policy.versions.map((version) => (
                    <div key={`${policy.id}-${version.version}`}>
                      <strong>{version.version}</strong>
                      <span className={`admin-badge admin-badge--${getStatusTone(version.status)}`}>{version.status}</span>
                      <small>{version.publishedAt} - {version.acknowledgedCount} acknowledgements</small>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <h2>Course Management</h2>
              <p>Assigned usage and versions show where training updates will affect active onboarding.</p>
            </div>
            <button type="button" className="admin-button admin-button--ghost">Update content</button>
          </div>
          <div className="admin-content-list">
            {courses.map((course) => (
              <section key={course.id} className="admin-content-item">
                <div className="admin-content-item__summary">
                  <div>
                    <h3>{course.title}</h3>
                    <p>Active {course.activeVersion} - updated {course.updatedAt}</p>
                  </div>
                  <span className={`admin-badge admin-badge--${getStatusTone(course.status)}`}>{course.status}</span>
                </div>
                <div className="admin-summary-list admin-summary-list--compact">
                  <div><strong>{course.assignedCount}</strong><span>Assigned users</span></div>
                  <div><strong>{course.completionRate}%</strong><span>Completion rate</span></div>
                </div>
                <div className="admin-version-list">
                  {course.versions.map((version) => (
                    <div key={`${course.id}-${version.version}`}>
                      <strong>{version.version}</strong>
                      <span className={`admin-badge admin-badge--${getStatusTone(version.status)}`}>{version.status}</span>
                      <small>{version.updatedAt} - {version.completionRate}% completion</small>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
