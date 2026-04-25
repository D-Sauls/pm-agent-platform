import type { ReactNode } from "react";
import type { AdminPageKey, AdminUserVm } from "../types";

interface AdminLayoutProps {
  currentPage: AdminPageKey;
  onNavigate: (page: AdminPageKey) => void;
  user: AdminUserVm;
  onLogout: () => void;
  children: ReactNode;
}

const navItems: Array<{ key: AdminPageKey; label: string; description: string }> = [
  { key: "dashboard", label: "Dashboard", description: "Risk and action overview" },
  { key: "employees", label: "Employees", description: "Compliance by person" },
  { key: "hrImport", label: "HR Import", description: "Bulk onboarding control" },
  { key: "content", label: "Content", description: "Courses and policies" },
  { key: "settings", label: "Settings", description: "Tenant security and branding" }
];

const roleAccess: Record<AdminUserVm["role"], AdminPageKey[]> = {
  superadmin: ["dashboard", "employees", "employeeDetail", "hrImport", "content", "settings"],
  supportadmin: ["dashboard", "employees", "employeeDetail", "hrImport", "content", "settings"],
  readonlyadmin: ["dashboard", "employees", "employeeDetail", "content"]
};

function isActiveNav(currentPage: AdminPageKey, itemKey: AdminPageKey) {
  return currentPage === itemKey || (currentPage === "employeeDetail" && itemKey === "employees");
}

export function AdminLayout({
  currentPage,
  onNavigate,
  user,
  onLogout,
  children
}: AdminLayoutProps) {
  const availableNav = navItems.filter((item) => roleAccess[user.role].includes(item.key));

  return (
    <div className="admin-shell">
      <aside className="admin-shell__sidebar" aria-label="Admin navigation">
        <div className="admin-shell__brand">
          <span className="admin-shell__mark">OC</span>
          <div>
            <strong>Onboarding Control</strong>
            <small>HR and compliance</small>
          </div>
        </div>
        <nav className="admin-shell__nav-list">
          {availableNav.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={isActiveNav(currentPage, item.key) ? "admin-shell__nav admin-shell__nav--active" : "admin-shell__nav"}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </button>
          ))}
        </nav>
      </aside>
      <section className="admin-shell__content">
        <header className="admin-shell__header">
          <div>
            <span className="eyebrow">Signed in admin</span>
            <strong>{user.displayName}</strong>
            <small>{user.role}</small>
          </div>
          <button type="button" className="admin-button admin-button--ghost" onClick={onLogout}>
            Logout
          </button>
        </header>
        <main className="admin-shell__main">{children}</main>
      </section>
    </div>
  );
}
