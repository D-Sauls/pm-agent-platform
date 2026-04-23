import { AdminApp } from "./admin/AdminApp";
import { EmployeePwaApp } from "./pwa/EmployeePwaApp";
import { resolveTenantRuntime } from "./pwa/runtime";
import { resolveAppSurface } from "./surface";
import { TeamsAppShell } from "./teams/TeamsAppShell";

export function App() {
  const runtime = resolveTenantRuntime(window.location);
  const surface = resolveAppSurface(runtime.surfacePath);

  if (surface === "admin") {
    return <AdminApp />;
  }
  if (surface === "teams") {
    return <TeamsAppShell />;
  }
  return <EmployeePwaApp />;
}
