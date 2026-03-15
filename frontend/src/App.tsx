import { AdminApp } from "./admin/AdminApp";
import { EmployeePwaApp } from "./pwa/EmployeePwaApp";
import { resolveAppSurface } from "./surface";
import { TeamsAppShell } from "./teams/TeamsAppShell";

// App entry for admin, employee PWA, and Teams tab surfaces.
export function App() {
  const surface = resolveAppSurface(window.location.pathname);
  if (surface === "admin") {
    return <AdminApp />;
  }
  if (surface === "teams") {
    return <TeamsAppShell />;
  }
  return <EmployeePwaApp />;
}
