import { buildApiUrl, resolveTenantRuntime } from "../pwa/runtime";

export interface EmployeeApiSession {
  tenantId: string;
  sessionToken: string;
}

function resolveApiUrl(path: string): string {
  const runtime = resolveTenantRuntime();
  return buildApiUrl(runtime.basePath, path);
}

function toPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function createEmployeeAuthHeaders(
  session: EmployeeApiSession,
  init?: HeadersInit,
  tenantId = session.tenantId
): Headers {
  const headers = new Headers(init);
  headers.set("Authorization", `Bearer ${session.sessionToken}`);
  headers.set("x-tenant-id", tenantId);
  return headers;
}

export function createJsonHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  headers.set("Content-Type", "application/json");
  return headers;
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      // Ignore response parsing errors and keep the fallback message.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchEmployeeResponse(
  path: string,
  session: EmployeeApiSession,
  init?: Omit<RequestInit, "headers"> & { headers?: HeadersInit; tenantId?: string }
): Promise<Response> {
  return fetch(resolveApiUrl(toPath(path)), {
    ...init,
    headers: createEmployeeAuthHeaders(session, init?.headers, init?.tenantId)
  });
}

export async function fetchEmployeeJson<T>(
  path: string,
  session: EmployeeApiSession,
  init?: Omit<RequestInit, "headers"> & { headers?: HeadersInit; tenantId?: string }
): Promise<T> {
  const response = await fetchEmployeeResponse(path, session, init);
  return parseJsonResponse<T>(response);
}

export async function postEmployeeJson<T>(
  path: string,
  session: EmployeeApiSession,
  body?: unknown,
  init?: Omit<RequestInit, "body" | "headers" | "method"> & { headers?: HeadersInit; tenantId?: string }
): Promise<T> {
  return fetchEmployeeJson<T>(path, session, {
    ...init,
    method: "POST",
    headers: createJsonHeaders(init?.headers),
    body: JSON.stringify(body ?? {})
  });
}

export async function fetchAnonymousJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveApiUrl(toPath(path)), init);
  return parseJsonResponse<T>(response);
}
