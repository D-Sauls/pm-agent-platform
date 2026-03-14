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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        minHeight: "100vh",
        fontFamily: "Segoe UI, sans-serif"
      }}
    >
      <aside style={{ borderRight: "1px solid #d8d8d8", padding: 12 }}>
        <h2>Admin</h2>
        {navItems.filter((item) => roleAccess[user.role].includes(item.key)).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.key)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              marginBottom: 8,
              padding: 8,
              borderRadius: 6,
              border: "1px solid #cfcfcf",
              background: currentPage === item.key ? "#ecf3ff" : "#fff"
            }}
          >
            {item.label}
          </button>
        ))}
      </aside>
      <section>
        <header
          style={{
            borderBottom: "1px solid #d8d8d8",
            padding: 12,
            display: "flex",
            justifyContent: "space-between"
          }}
        >
          <div>
            <strong>{user.displayName}</strong> ({user.role})
          </div>
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </header>
        <main style={{ padding: 16 }}>{children}</main>
      </section>
    </div>
  );
}
