import { useEffect, useState } from "react";
import {
  formatAdminDate,
  getStatusLabel,
  getStatusTone,
  loadAdminDashboard,
  type AdminDashboardResponse
} from "../api/adminExperienceApi";

interface DashboardPageProps {
  onOpenEmployee: (employeeId: string) => void;
}

export function DashboardPage({ onOpenEmployee }: DashboardPageProps) {
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadAdminDashboard()
      .then((result) => {
        if (!cancelled) setDashboard(result);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="admin-loading">Loading admin dashboard...</p>;
  if (error) return <p className="admin-error">{error}</p>;
  if (!dashboard) return <p className="admin-empty-state">No dashboard data is available.</p>;

  return (
    <section className="admin-page-stack">
      <div className="admin-page-heading">
        <span className="eyebrow">Admin dashboard</span>
        <h1>Onboarding and compliance overview</h1>
        <p>Focus on people who are overdue, non-compliant, or blocked from completing assigned onboarding.</p>
      </div>

      <div className="admin-kpi-grid" aria-label="Compliance key metrics">
        <article className="admin-kpi-card">
          <span>Total employees</span>
          <strong>{dashboard.kpis.totalEmployees}</strong>
          <small>Active onboarding population</small>
        </article>
        <article className="admin-kpi-card admin-kpi-card--success">
          <span>Compliant</span>
          <strong>{dashboard.kpis.compliantEmployees}</strong>
          <small>{dashboard.kpis.nonCompliantEmployees} require follow-up</small>
        </article>
        <article className="admin-kpi-card admin-kpi-card--danger">
          <span>Overdue users</span>
          <strong>{dashboard.kpis.overdueUsers}</strong>
          <small>Past due assigned work</small>
        </article>
        <article className="admin-kpi-card admin-kpi-card--info">
          <span>Onboarding completion</span>
          <strong>{dashboard.kpis.onboardingCompletion}%</strong>
          <small>Average across assigned users</small>
        </article>
      </div>

      <div className="admin-panel-grid">
        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>At Risk</h2>
              <p>Users failing compliance or carrying overdue work.</p>
            </div>
            <span className="admin-badge admin-badge--danger">{dashboard.atRisk.length} users</span>
          </div>
          {dashboard.atRisk.length === 0 ? (
            <p className="admin-empty-state">No at-risk users found for this tenant.</p>
          ) : (
            <div className="admin-list-stack">
              {dashboard.atRisk.map((employee) => (
                <button key={employee.id} type="button" className="admin-person-row" onClick={() => onOpenEmployee(employee.id)}>
                  <span>
                    <strong>{employee.name}</strong>
                    <small>{employee.department} - {employee.role}</small>
                  </span>
                  <span className={`admin-badge admin-badge--${getStatusTone(employee.complianceStatus)}`}>
                    {getStatusLabel(employee.complianceStatus)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Recent Activity</h2>
              <p>Latest acknowledgement, progress, and compliance events.</p>
            </div>
          </div>
          {dashboard.recentActivity.length === 0 ? (
            <p className="admin-empty-state">No recent admin or evidence events yet.</p>
          ) : (
            <ol className="admin-timeline admin-timeline--compact">
              {dashboard.recentActivity.map((activity) => (
                <li key={activity.id} className={`admin-timeline__item admin-timeline__item--${activity.tone}`}>
                  <span>{formatAdminDate(activity.date)}</span>
                  <strong>{activity.title}</strong>
                  <p>{activity.detail}</p>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <h2>Action Required</h2>
              <p>Operational tasks that need admin review before users are fully compliant.</p>
            </div>
          </div>
          {dashboard.actionRequired.length === 0 ? (
            <p className="admin-empty-state">No open admin actions for this tenant.</p>
          ) : (
            <div className="admin-action-grid">
              {dashboard.actionRequired.map((action) => (
                <section key={action.id} className="admin-action-card">
                  <span className={`admin-badge admin-badge--${action.urgency === "critical" ? "danger" : action.urgency === "high" ? "warning" : "neutral"}`}>
                    {action.urgency}
                  </span>
                  <h3>{action.title}</h3>
                  <p>{action.detail}</p>
                  <small>Owner: {action.owner}</small>
                </section>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
