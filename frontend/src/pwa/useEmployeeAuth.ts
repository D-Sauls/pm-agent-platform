import { useState } from "react";
import { clearEmployeeSession, loadEmployeeSession, saveEmployeeSession } from "../session/employeeSession";
import { activateEmployee, loginEmployee } from "./api";
import { resolveTenantRuntime } from "./runtime";
import type { EmployeeSession } from "./types";
import { formatDisplayName, readActivationToken } from "./workspaceHelpers";
import type { AuthMode } from "./workspaceTypes";

function buildEmployeeSession(result: {
  user: {
    id: string;
    tenantId: string;
    username: string;
    firstName: string;
    lastName: string;
    roleName?: string | null;
    department?: string | null;
  };
  sessionToken: string;
}): EmployeeSession {
  return {
    userId: result.user.id,
    tenantId: result.user.tenantId,
    username: result.user.username,
    displayName: formatDisplayName(result.user),
    role: result.user.roleName ?? "Employee",
    department: result.user.department ?? undefined,
    sessionToken: result.sessionToken
  };
}

export function useEmployeeAuth() {
  const [runtime] = useState(() => resolveTenantRuntime());
  const [authMode, setAuthMode] = useState<AuthMode>(() => (readActivationToken() ? "activate" : "login"));
  const [activationToken, setActivationToken] = useState(() => readActivationToken());
  const [session, setSession] = useState<EmployeeSession | null>(() => loadEmployeeSession());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(input: { username: string; password: string }) {
    try {
      setLoading(true);
      setError(null);
      const nextSession = buildEmployeeSession(await loginEmployee(input.username, input.password));
      saveEmployeeSession(nextSession);
      setSession(nextSession);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function activateAccount(input: { token: string; password: string }) {
    try {
      setLoading(true);
      setError(null);
      const nextSession = buildEmployeeSession(await activateEmployee(input.token, input.password));
      saveEmployeeSession(nextSession);
      setSession(nextSession);
      setActivationToken("");
      setAuthMode("login");
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to activate your account.");
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    clearEmployeeSession();
    setSession(null);
    setError(null);
    setAuthMode("login");
    setActivationToken("");
  }

  function clearError() {
    setError(null);
  }

  return {
    runtime,
    authMode,
    setAuthMode,
    activationToken,
    setActivationToken,
    session,
    loading,
    error,
    signIn,
    activateAccount,
    signOut,
    clearError
  };
}
