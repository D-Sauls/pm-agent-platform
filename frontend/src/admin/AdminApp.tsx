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
    return <p style={{ padding: 16 }}>Loading admin session...</p>;
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
      {currentPage === "tenants" ? <TenantsListPage /> : null}
      {currentPage === "tenantDetail" ? <TenantDetailPage /> : null}
      {currentPage === "licenses" ? <LicenseManagementPage /> : null}
      {currentPage === "featureFlags" ? <FeatureFlagsPage /> : null}
      {currentPage === "prompts" ? <PromptRegistryPage /> : null}
      {currentPage === "enhancements" ? <EnhancementRequestsPage /> : null}
      {currentPage === "connectors" ? <ConnectorHealthPage /> : null}
      {currentPage === "logs" ? <AuditLogsPage /> : null}
    </AdminLayout>
  );
}
