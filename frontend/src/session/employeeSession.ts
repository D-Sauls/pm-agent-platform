import type { EmployeeSession } from "../pwa/types";

const EMPLOYEE_SESSION_KEY = "employee_session";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) {
    return storage;
  }
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadEmployeeSession(storage?: StorageLike): EmployeeSession | null {
  const target = resolveStorage(storage);
  if (!target) {
    return null;
  }

  try {
    const raw = target.getItem(EMPLOYEE_SESSION_KEY);
    return raw ? (JSON.parse(raw) as EmployeeSession) : null;
  } catch {
    return null;
  }
}

export function saveEmployeeSession(session: EmployeeSession, storage?: StorageLike): void {
  const target = resolveStorage(storage);
  if (!target) {
    return;
  }
  try {
    target.setItem(EMPLOYEE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Browser storage can be blocked in private or embedded contexts.
  }
}

export function clearEmployeeSession(storage?: StorageLike): void {
  const target = resolveStorage(storage);
  if (!target) {
    return;
  }
  try {
    target.removeItem(EMPLOYEE_SESSION_KEY);
  } catch {
    // Logout should still proceed if browser storage is unavailable.
  }
}

export function hasEmployeeSession(session: EmployeeSession | null): session is EmployeeSession {
  return Boolean(session?.tenantId && session.sessionToken);
}

export function toEmployeeSessionAccess(
  session: Pick<EmployeeSession, "tenantId" | "sessionToken" | "userId" | "role" | "department">
): {
  tenantId: string;
  sessionToken: string;
  userId: string;
  role: string;
  department?: string;
} {
  return {
    tenantId: session.tenantId,
    sessionToken: session.sessionToken,
    userId: session.userId,
    role: session.role,
    department: session.department
  };
}
