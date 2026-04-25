import { useMemo, useState } from "react";
import { adminEmployees, getStatusLabel, getStatusTone } from "../data/adminExperienceData";

interface EmployeeCompliancePageProps {
  onOpenEmployee: (employeeId: string) => void;
}

export function EmployeeCompliancePage({ onOpenEmployee }: EmployeeCompliancePageProps) {
  const [department, setDepartment] = useState("all");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [previewEmployeeId, setPreviewEmployeeId] = useState(adminEmployees[0]?.id ?? "");

  const departments = Array.from(new Set(adminEmployees.map((employee) => employee.department)));
  const roles = Array.from(new Set(adminEmployees.map((employee) => employee.role)));
  const previewEmployee = adminEmployees.find((employee) => employee.id === previewEmployeeId) ?? adminEmployees[0];

  const filteredEmployees = useMemo(
    () => adminEmployees.filter((employee) => {
      const departmentMatch = department === "all" || employee.department === department;
      const roleMatch = role === "all" || employee.role === role;
      const statusMatch = status === "all" || employee.complianceStatus === status;
      return departmentMatch && roleMatch && statusMatch;
    }),
    [department, role, status]
  );

  return (
    <section className="admin-page-stack">
      <div className="admin-page-heading">
        <span className="eyebrow">Employee compliance</span>
        <h1>Find non-compliant users quickly</h1>
        <p>Filter by department, role, or status. Select a row for a side preview, then open the evidence timeline when needed.</p>
      </div>

      <div className="admin-filter-bar" aria-label="Employee compliance filters">
        <label>
          Department
          <select value={department} onChange={(event) => setDepartment(event.target.value)}>
            <option value="all">All departments</option>
            {departments.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Role
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="all">All roles</option>
            {roles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="compliant">Compliant</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="non_compliant">Non-compliant</option>
          </select>
        </label>
      </div>

      <div className="admin-split-view">
        <article className="admin-panel admin-panel--table">
          <div className="admin-panel__header">
            <div>
              <h2>Employees</h2>
              <p>{filteredEmployees.length} users match the current filters.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Overdue</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} onClick={() => setPreviewEmployeeId(employee.id)} className={previewEmployeeId === employee.id ? "admin-table__row--active" : undefined}>
                    <td>
                      <button type="button" className="admin-link-button" onClick={() => setPreviewEmployeeId(employee.id)}>
                        {employee.name}
                      </button>
                    </td>
                    <td>{employee.employeeCode}</td>
                    <td>{employee.department}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${getStatusTone(employee.complianceStatus)}`}>
                        {getStatusLabel(employee.complianceStatus)}
                      </span>
                    </td>
                    <td>{employee.overdueItems > 0 ? `${employee.overdueItems} overdue` : "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="admin-side-panel" aria-label="Employee compliance preview">
          <span className="eyebrow">Selected employee</span>
          <h2>{previewEmployee.name}</h2>
          <p>{previewEmployee.employeeCode} - {previewEmployee.department} - {previewEmployee.role}</p>
          <div className="admin-progress-block">
            <div>
              <strong>{previewEmployee.onboardingProgress}%</strong>
              <span>Onboarding progress</span>
            </div>
            <div className="admin-progress-bar"><span style={{ width: `${previewEmployee.onboardingProgress}%` }} /></div>
          </div>
          <dl className="admin-detail-list">
            <div>
              <dt>Status</dt>
              <dd><span className={`admin-badge admin-badge--${getStatusTone(previewEmployee.complianceStatus)}`}>{getStatusLabel(previewEmployee.complianceStatus)}</span></dd>
            </div>
            <div>
              <dt>Last activity</dt>
              <dd>{previewEmployee.lastActivity}</dd>
            </div>
            <div>
              <dt>Next action</dt>
              <dd>{previewEmployee.nextAction}</dd>
            </div>
          </dl>
          <button type="button" className="admin-button" onClick={() => onOpenEmployee(previewEmployee.id)}>
            Open evidence timeline
          </button>
        </aside>
      </div>
    </section>
  );
}
