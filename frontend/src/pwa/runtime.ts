export interface FrontendRuntimeConfig {
  tenantId?: string;
  basePath?: string;
  passwordResetUrl?: string;
}

declare global {
  interface Window {
    __ONBOARDING_CONFIG__?: FrontendRuntimeConfig;
  }
}

export interface TenantRuntime {
  tenantId: string;
  basePath: string;
  surfacePath: string;
  passwordResetUrl?: string;
}

function readMeta(name: string): string | undefined {
  const value = document.querySelector(`meta[name="${name}"]`)?.getAttribute("content")?.trim();
  return value || undefined;
}

function normalizeBasePath(value: string | undefined): string {
  if (!value || value === "/") {
    return "";
  }
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return normalized.replace(/\/+$/, "");
}

function resolveBasePath(pathname: string): string {
  const configured = window.__ONBOARDING_CONFIG__?.basePath ?? readMeta("app-base-path");
  if (configured) {
    return normalizeBasePath(configured);
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "onboarding_training") {
    return "/onboarding_training";
  }
  if (segments.length > 1 && ["admin", "teams"].includes(segments[1] ?? "")) {
    return `/${segments[0]}`;
  }
  return "";
}

function stripBasePath(pathname: string, basePath: string): string {
  const normalizedPath = pathname || "/";
  if (!basePath) {
    return normalizedPath;
  }
  if (normalizedPath === basePath) {
    return "/";
  }
  if (normalizedPath.startsWith(`${basePath}/`)) {
    return normalizedPath.slice(basePath.length) || "/";
  }
  return normalizedPath;
}

function inferTenantFromHost(hostname: string): string | undefined {
  if (!hostname || hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return undefined;
  }

  const parts = hostname.split(".");
  if (parts.length < 3) {
    return undefined;
  }

  const subdomain = parts[0]?.toLowerCase();
  if (!subdomain || ["www", "admin", "teams"].includes(subdomain)) {
    return undefined;
  }

  return subdomain;
}

function resolveTenantId(hostname: string): string {
  const configured = window.__ONBOARDING_CONFIG__?.tenantId ?? readMeta("tenant-id") ?? inferTenantFromHost(hostname);
  return configured || "tenant-acme";
}

export function resolveTenantRuntime(locationLike: Pick<Location, "hostname" | "pathname"> = window.location): TenantRuntime {
  const basePath = resolveBasePath(locationLike.pathname);
  return {
    tenantId: resolveTenantId(locationLike.hostname),
    basePath,
    surfacePath: stripBasePath(locationLike.pathname, basePath),
    passwordResetUrl: window.__ONBOARDING_CONFIG__?.passwordResetUrl ?? readMeta("password-reset-url")
  };
}

export function withBasePath(basePath: string, path: string): string {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  if (!basePath) {
    return safePath;
  }
  return `${basePath}${safePath}`;
}

export function buildApiUrl(basePath: string, path: string): string {
  return withBasePath(basePath, `/api${path.startsWith("/") ? path : `/${path}`}`);
}
