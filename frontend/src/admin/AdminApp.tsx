import { useEffect, useState } from "react";
import {
  clearAdminToken,
  getCurrentAdmin,
  getAdminToken,
  setAdminToken
} from "../api/adminClient";
import { AdminLayout } from "./components/AdminLayout";
import { adminEmployees } from "./data/adminExperienceData";
import { ContentManagementPage } from "./pages/ContentManagementPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeeCompliancePage } from "./pages/EmployeeCompliancePage";
import { EmployeeDetailPage } from "./pages/EmployeeDetailPage";
import { HrImportPage } from "./pages/HrImportPage";
import { LoginPage } from "./pages/LoginPage";
import { TenantSettingsPage } from "./pages/TenantSettingsPage";
import type { AdminPageKey, AdminUserVm } from "./types";

export function AdminApp() {
  const [currentPage, setCurrentPage] = useState<AdminPageKey>("dashboard");
  const [adminUser, setAdminUser] = useState<AdminUserVm | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(adminEmployees[0]?.id ?? "");
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
      {currentPage === "employeeDetail" ? (
        <EmployeeDetailPage
          employeeId={selectedEmployeeId}
          onBack={() => setCurrentPage("employees")}
        />
      ) : null}
      {currentPage === "hrImport" ? <HrImportPage /> : null}
      {currentPage === "content" ? <ContentManagementPage /> : null}
      {currentPage === "settings" ? <TenantSettingsPage /> : null}
    </AdminLayout>
  );
}
