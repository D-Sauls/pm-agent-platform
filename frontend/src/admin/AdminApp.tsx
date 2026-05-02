import { useCallback, useEffect, useState } from "react";
import {
  clearAdminToken,
  getCurrentAdmin,
  getAdminToken,
  setAdminToken
} from "../api/adminClient";
import { AdminLayout } from "./components/AdminLayout";
import { ContentManagementPage } from "./pages/ContentManagementPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeeCompliancePage } from "./pages/EmployeeCompliancePage";
import { EmployeeDetailPage } from "./pages/EmployeeDetailPage";
import { HrImportPage } from "./pages/HrImportPage";
import { LoginPage } from "./pages/LoginPage";
import { TenantSettingsPage } from "./pages/TenantSettingsPage";
import { getAdminTenantId, setAdminTenantId } from "./api/adminTenantScope.js";
import type { AdminPageKey, AdminUserVm } from "./types";

export function AdminApp() {
  const [currentPage, setCurrentPage] = useState<AdminPageKey>("dashboard");
  const [adminUser, setAdminUser] = useState<AdminUserVm | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState(getAdminTenantId());
  const [checkingSession, setCheckingSession] = useState(true);

  const handleTenantChange = useCallback((tenantId: string) => {
    setAdminTenantId(tenantId);
    setSelectedTenantId(tenantId);
    setSelectedEmployeeId("");
    setCurrentPage((page) => page === "employeeDetail" ? "employees" : page);
  }, []);

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
      selectedTenantId={selectedTenantId}
      onTenantChange={handleTenantChange}
      onLogout={() => {
        clearAdminToken();
        setAdminUser(null);
      }}
    >
      <div key={selectedTenantId}>
        {currentPage === "dashboard" ? (
          <DashboardPage
            onOpenEmployee={(employeeId) => {
              setSelectedEmployeeId(employeeId);
              setCurrentPage("employeeDetail");
            }}
          />
        ) : null}
        {currentPage === "employees" ? (
          <EmployeeCompliancePage
            onOpenEmployee={(employeeId) => {
              setSelectedEmployeeId(employeeId);
              setCurrentPage("employeeDetail");
            }}
          />
        ) : null}
        {currentPage === "employeeDetail" && selectedEmployeeId ? (
          <EmployeeDetailPage
            employeeId={selectedEmployeeId}
            onBack={() => setCurrentPage("employees")}
          />
        ) : null}
        {currentPage === "hrImport" ? <HrImportPage /> : null}
        {currentPage === "content" ? <ContentManagementPage /> : null}
        {currentPage === "settings" ? <TenantSettingsPage /> : null}
      </div>
    </AdminLayout>
  );
}

