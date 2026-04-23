import type { ReactNode } from "react";
import type { AdminPageKey, AdminUserVm } from "../types";

interface AdminLayoutProps {
  currentPage: AdminPageKey;
  onNavigate: (page: AdminPageKey) => void;
  user: AdminUserVm;
  onLogout: () => void;
  children: ReactNode;
}

const navItems: Array<{ key: AdminPageKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "tenants", label: "Tenants" },
  { key: "tenantDetail", label: "Tenant Detail" },
  { key: "licenses", label: "Licenses" },
  { key: "featureFlags", label: "Feature Flags" },
  { key: "prompts", label: "Prompt Registry" },
  { key: "enhancements", label: "Enhancements" },
  { key: "connectors", label: "Connector Health" },
  { key: "compliance", label: "Compliance" },
  { key: "logs", label: "Audit / Logs" }
];

const roleAccess: Record<AdminUserVm["role"], AdminPageKey[]> = {
  superadmin: navItems.map((item) => item.key),
  supportadmin: ["dashboard", "tenants", "tenantDetail", "licenses", "enhancements", "connectors", "compliance", "logs"],
  readonlyadmin: ["dashboard", "tenants", "tenantDetail", "connectors", "compliance", "logs"]
};

export function AdminLayout({
  currentPage,
  onNavigate,
  user,
  onLogout,
  children
}: AdminLayoutProps) {
  return (
    <div className="admin-shell">
      <aside className="admin-shell__sidebar">
        <h2>Admin</h2>
        {navItems.filter((item) => roleAccess[user.role].includes(item.key)).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.key)}
            className={currentPage === item.key ? "admin-shell__nav admin-shell__nav--active" : "admin-shell__nav"}
          >
            {item.label}
          </button>
        ))}
      </aside>
      <section>
        <header className="admin-shell__header">
          <div>
            <strong>{user.displayName}</strong> ({user.role})
          </div>
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </header>
        <main className="admin-shell__main">{children}</main>
      </section>
    </div>
  );
}
