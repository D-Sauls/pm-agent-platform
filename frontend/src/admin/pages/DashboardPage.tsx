import { adminActions, adminActivity, adminEmployees, getStatusLabel, getStatusTone } from "../data/adminExperienceData";

interface DashboardPageProps {
  onOpenEmployee: (employeeId: string) => void;
}

export function DashboardPage({ onOpenEmployee }: DashboardPageProps) {
  const totalEmployees = adminEmployees.length;
  const compliantEmployees = adminEmployees.filter((employee) => employee.complianceStatus === "compliant").length;
  const nonCompliantEmployees = adminEmployees.filter((employee) => employee.complianceStatus !== "compliant").length;
  const overdueUsers = adminEmployees.filter((employee) => employee.overdueItems > 0).length;
  const averageProgress = Math.round(
    adminEmployees.reduce((total, employee) => total + employee.onboardingProgress, 0) / totalEmployees
  );
  const atRiskEmployees = adminEmployees.filter((employee) => employee.complianceStatus === "overdue" || employee.complianceStatus === "non_compliant");

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
          <strong>{totalEmployees}</strong>
          <small>Active onboarding population</small>
        </article>
        <article className="admin-kpi-card admin-kpi-card--success">
          <span>Compliant</span>
          <strong>{compliantEmployees}</strong>
          <small>{nonCompliantEmployees} require follow-up</small>
        </article>
        <article className="admin-kpi-card admin-kpi-card--danger">
          <span>Overdue users</span>
          <strong>{overdueUsers}</strong>
          <small>Past due assigned work</small>
        </article>
        <article className="admin-kpi-card admin-kpi-card--info">
          <span>Onboarding completion</span>
          <strong>{averageProgress}%</strong>
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
            <span className="admin-badge admin-badge--danger">{atRiskEmployees.length} users</span>
          </div>
          <div className="admin-list-stack">
            {atRiskEmployees.map((employee) => (
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
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>Recent Activity</h2>
              <p>Latest acknowledgement, progress, and compliance events.</p>
            </div>
          </div>
          <ol className="admin-timeline admin-timeline--compact">
            {adminActivity.map((activity) => (
              <li key={activity.id} className={`admin-timeline__item admin-timeline__item--${activity.tone}`}>
                <span>{activity.date}</span>
                <strong>{activity.title}</strong>
                <p>{activity.detail}</p>
              </li>
            ))}
          </ol>
        </article>

        <article className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <h2>Action Required</h2>
              <p>Operational tasks that need admin review before users are fully compliant.</p>
            </div>
          </div>
          <div className="admin-action-grid">
            {adminActions.map((action) => (
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
        </article>
      </div>
    </section>
  );
}
