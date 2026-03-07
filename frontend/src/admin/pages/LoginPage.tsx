import { FormEvent, useEffect, useState } from "react";
import { adminLogin, getAuthMode } from "../../api/adminClient";
import type { AdminUserVm } from "../types";

interface LoginPageProps {
  onLoggedIn: (token: string, user: AdminUserVm) => void;
}

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [email, setEmail] = useState("admin@local.dev");
  const [password, setPassword] = useState("ChangeMe123!");
  const [mode, setMode] = useState<"local" | "entra">("local");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAuthMode()
      .then((result) => setMode(result.mode))
      .catch(() => setMode("entra"));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await adminLogin(email, password);
      onLoggedIn(session.token, session.user);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", fontFamily: "Segoe UI, sans-serif" }}>
      <h1>Admin Control Plane</h1>
      <p>Auth mode: {mode}</p>
      {mode === "local" ? (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      ) : (
        <p>Entra ID mode scaffolded. Interactive sign-in will be connected in the next phase.</p>
      )}
      {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}
    </main>
  );
}
