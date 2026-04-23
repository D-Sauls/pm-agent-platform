import { useEffect, useState } from "react";
import {
  clearAdminToken,
  getCurrentAdmin,
  getAdminToken,
  setAdminToken
} from "../api/adminClient";
import { AdminLayout } from "./components/AdminLayout";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { ConnectorHealthPage } from "./pages/ConnectorHealthPage";
import { CompliancePage } from "./pages/CompliancePage";
import { DashboardPage } from "./pages/DashboardPage";
import { EnhancementRequestsPage } from "./pages/EnhancementRequestsPage";
import { FeatureFlagsPage } from "./pages/FeatureFlagsPage";
import { LicenseManagementPage } from "./pages/LicenseManagementPage";
import { LoginPage } from "./pages/LoginPage";
import { PromptRegistryPage } from "./pages/PromptRegistryPage";
import { TenantDetailPage } from "./pages/TenantDetailPage";
import { TenantsListPage } from "./pages/TenantsListPage";
import type { AdminPageKey, AdminUserVm } from "./types";

export function AdminApp() {
  const [currentPage, setCurrentPage] = useState<AdminPageKey>("dashboard");
  const [adminUser, setAdminUser] = useState<AdminUserVm | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState("tenant-acme");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setCheckingSession(false);
      return;
    }
    getCurrentAdmin()
      .then((result) => setAdminUser(result.user))
      .catch(() => clearAdminToken())
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) {
    return <p className="admin-loading">Loading admin session...</p>;
  }

  if (!adminUser) {
    return (
      <LoginPage
        onLoggedIn={(token, user) => {
          setAdminToken(token);
          setAdminUser(user);
        }}
      />
    );
  }

  return (
    <AdminLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      user={adminUser}
      onLogout={() => {
        clearAdminToken();
        setAdminUser(null);
      }}
    >
      {currentPage === "dashboard" ? <DashboardPage /> : null}
      {currentPage === "tenants" ? (
        <TenantsListPage
          adminRole={adminUser.role}
          onOpenTenant={(tenantId) => {
            setSelectedTenantId(tenantId);
            setCurrentPage("tenantDetail");
          }}
        />
      ) : null}
      {currentPage === "tenantDetail" ? (
        <TenantDetailPage tenantId={selectedTenantId} onTenantIdChange={setSelectedTenantId} />
      ) : null}
      {currentPage === "licenses" ? <LicenseManagementPage adminRole={adminUser.role} /> : null}
      {currentPage === "featureFlags" ? <FeatureFlagsPage adminRole={adminUser.role} /> : null}
      {currentPage === "prompts" ? <PromptRegistryPage adminRole={adminUser.role} /> : null}
      {currentPage === "enhancements" ? <EnhancementRequestsPage /> : null}
      {currentPage === "connectors" ? <ConnectorHealthPage adminRole={adminUser.role} /> : null}
      {currentPage === "compliance" ? <CompliancePage adminRole={adminUser.role} /> : null}
      {currentPage === "logs" ? <AuditLogsPage /> : null}
    </AdminLayout>
  );
}
