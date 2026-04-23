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
  return window.localStorage;
}

export function loadEmployeeSession(storage?: StorageLike): EmployeeSession | null {
  const target = resolveStorage(storage);
  if (!target) {
    return null;
  }

  const raw = target.getItem(EMPLOYEE_SESSION_KEY);
  return raw ? (JSON.parse(raw) as EmployeeSession) : null;
}

export function saveEmployeeSession(session: EmployeeSession, storage?: StorageLike): void {
  const target = resolveStorage(storage);
  if (!target) {
    return;
  }
  target.setItem(EMPLOYEE_SESSION_KEY, JSON.stringify(session));
}

export function clearEmployeeSession(storage?: StorageLike): void {
  const target = resolveStorage(storage);
  if (!target) {
    return;
  }
  target.removeItem(EMPLOYEE_SESSION_KEY);
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
