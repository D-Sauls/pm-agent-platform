export type AppSurface = "admin" | "teams" | "pwa";

export function resolveAppSurface(pathname: string): AppSurface {
  if (pathname.startsWith("/admin")) {
    return "admin";
  }
  if (pathname.startsWith("/teams")) {
    return "teams";
  }
  return "pwa";
}
