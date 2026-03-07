import { AdminApp } from "./admin/AdminApp";
import { TeamsAppShell } from "./teams/TeamsAppShell";

// App entry for Teams tab surface and local web testing.
export function App() {
  if (window.location.pathname.startsWith("/admin")) {
    return <AdminApp />;
  }
  return <TeamsAppShell />;
}
