export interface AdminSession {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: "superadmin" | "supportadmin" | "readonlyadmin";
  };
}

const ADMIN_TOKEN_KEY = "pm_agent_admin_token";
const ADMIN_API_BASE = "/api/admin";

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${ADMIN_API_BASE}${path}`, { ...init, headers });
}

async function parseError(response: Response, fallback: string): Promise<never> {
  try {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error ?? fallback);
  } catch {
    throw new Error(fallback);
  }
}

export async function adminLogin(email: string, password: string): Promise<AdminSession> {
  const response = await adminFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    return parseError(response, "Admin login failed");
  }
  return response.json();
}

export async function getAuthMode(): Promise<{ mode: "local" | "entra" }> {
  const response = await adminFetch("/auth/mode");
  if (!response.ok) {
    return parseError(response, "Failed to load auth mode");
  }
  return response.json();
}

export async function getCurrentAdmin(): Promise<{ user: AdminSession["user"] }> {
  const response = await adminFetch("/auth/me");
  if (!response.ok) {
    return parseError(response, "Admin session invalid");
  }
  return response.json();
}

export async function getAdminJson<T>(path: string): Promise<T> {
  const response = await adminFetch(path);
  if (!response.ok) {
    return parseError(response, `Failed to load ${path}`);
  }
  return response.json();
}

export async function postAdminJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await adminFetch(path, {
    method: "POST",
    body: JSON.stringify(body ?? {})
  });
  if (!response.ok) {
    return parseError(response, `Request failed ${path}`);
  }
  return response.json();
}

export async function patchAdminJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await adminFetch(path, {
    method: "PATCH",
    body: JSON.stringify(body ?? {})
  });
  if (!response.ok) {
    return parseError(response, `Request failed ${path}`);
  }
  return response.json();
}
