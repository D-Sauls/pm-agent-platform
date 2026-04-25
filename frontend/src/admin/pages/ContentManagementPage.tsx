import { useEffect, useState } from "react";
import {
  formatAdminDate,
  getStatusTone,
  loadAdminContent,
  publishCourseVersion,
  publishPolicyVersion,
  type AdminContentResponse
} from "../api/adminExperienceApi";

export function ContentManagementPage() {
  const [content, setContent] = useState<AdminContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadAdminContent()
      .then((result) => {
        if (!cancelled) setContent(result);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Failed to load content management");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePublishPolicy(policyId: string) {
    const versionLabel = window.prompt("New policy version label, for example v5");
    if (!versionLabel) return;
    setPublishingId(policyId);
    setError(null);
    setMessage(null);
    try {
      const next = await publishPolicyVersion(policyId, versionLabel);
      setContent(next);
      setMessage("Policy version published. Prior acknowledgements for older versions were invalidated where applicable.");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Failed to publish policy version");
    } finally {
      setPublishingId(null);
    }
  }

  async function handlePublishCourse(courseId: string) {
    const versionLabel = window.prompt("New course version label, for example v2");
    if (!versionLabel) return;
    setPublishingId(courseId);
    setError(null);
    setMessage(null);
    try {
      const next = await publishCourseVersion(courseId, versionLabel);
      setContent(next);
      setMessage("Course version published and version history updated.");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Failed to publish course version");
    } finally {
      setPublishingId(null);
    }
  }

  if (loading) return <p className="admin-loading">Loading course and policy versions...</p>;
  if (error && !content) return <p className="admin-error">{error}</p>;
  if (!content) return <p className="admin-empty-state">No content data is available.</p>;

  return (
    <section className="admin-page-stack">
      <div className="admin-page-heading">
        <span className="eyebrow">Content management</span>
        <h1>Policy and course versions</h1>
        <p>Version publishing is intentional because policy updates can trigger re-acknowledgement and reassignment impact.</p>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      {message ? <p className="admin-success-text">{message}</p> : null}

      <div className="admin-panel-grid">
        <article className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <h2>Policy Management</h2>
              <p>Active version, acknowledgement coverage, and re-ack impact are visible before publishing.</p>
            </div>
          </div>
          {content.policies.length === 0 ? (
            <p className="admin-empty-state">No policies found for this tenant.</p>
          ) : (
            <div className="admin-content-list">
              {content.policies.map((policy) => (
                <section key={policy.id} className="admin-content-item">
                  <div className="admin-content-item__summary">
                    <div>
                      <h3>{policy.title}</h3>
                      <p>Active {policy.activeVersion} - effective {formatAdminDate(policy.effectiveDate)}</p>
                    </div>
                    <span className={`admin-badge admin-badge--${getStatusTone(policy.status)}`}>{policy.status}</span>
                  </div>
                  <div className="admin-summary-list admin-summary-list--compact">
                    <div><strong>{policy.acknowledgedCount}/{policy.assignedCount}</strong><span>Acknowledged</span></div>
                    <div><strong>{policy.reackImpact}</strong><span>Re-ack impact</span></div>
                  </div>
                  <div className="admin-version-list">
                    {policy.versions.length === 0 ? <p className="admin-empty-state">No versions published yet.</p> : null}
                    {policy.versions.map((version) => (
                      <div key={version.id}>
                        <strong>{version.version}</strong>
                        <span className={`admin-badge admin-badge--${getStatusTone(version.status)}`}>{version.status}</span>
                        <small>{formatAdminDate(version.publishedAt)} - {version.acknowledgedCount} acknowledgements</small>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="admin-button admin-button--danger admin-button--fit" disabled={publishingId === policy.id} onClick={() => handlePublishPolicy(policy.id)}>
                    {publishingId === policy.id ? "Publishing..." : "Publish new version"}
                  </button>
                </section>
              ))}
            </div>
          )}
        </article>

        <article className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <h2>Course Management</h2>
              <p>Assigned usage and versions show where training updates will affect active onboarding.</p>
            </div>
          </div>
          {content.courses.length === 0 ? (
            <p className="admin-empty-state">No courses found for this tenant.</p>
          ) : (
            <div className="admin-content-list">
              {content.courses.map((course) => (
                <section key={course.id} className="admin-content-item">
                  <div className="admin-content-item__summary">
                    <div>
                      <h3>{course.title}</h3>
                      <p>Active {course.activeVersion} - updated {formatAdminDate(course.updatedAt)}</p>
                    </div>
                    <span className={`admin-badge admin-badge--${getStatusTone(course.status)}`}>{course.status}</span>
                  </div>
                  <div className="admin-summary-list admin-summary-list--compact">
                    <div><strong>{course.assignedCount}</strong><span>Assigned users</span></div>
                    <div><strong>{course.completionRate}%</strong><span>Completion rate</span></div>
                  </div>
                  <div className="admin-version-list">
                    {course.versions.length === 0 ? <p className="admin-empty-state">No versions published yet.</p> : null}
                    {course.versions.map((version) => (
                      <div key={version.id}>
                        <strong>{version.version}</strong>
                        <span className={`admin-badge admin-badge--${getStatusTone(version.status)}`}>{version.status}</span>
                        <small>{formatAdminDate(version.updatedAt)} - {version.completionRate}% completion</small>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="admin-button admin-button--ghost admin-button--fit" disabled={publishingId === course.id} onClick={() => handlePublishCourse(course.id)}>
                    {publishingId === course.id ? "Publishing..." : "Update content version"}
                  </button>
                </section>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
