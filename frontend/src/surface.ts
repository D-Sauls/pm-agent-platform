export type AppSurface = "admin" | "teams" | "pwa";

export function resolveAppSurface(pathname: string): AppSurface {
  const normalized = pathname || "/";
  if (normalized === "/admin" || normalized.startsWith("/admin/")) {
    return "admin";
  }
  if (normalized === "/teams" || normalized.startsWith("/teams/")) {
    return "teams";
  }
  return "pwa";
}
