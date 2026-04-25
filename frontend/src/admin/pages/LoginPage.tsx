import { FormEvent, useEffect, useState } from "react";
import { adminLogin, getAuthMode } from "../../api/adminClient";
import type { AdminUserVm } from "../types";

interface LoginPageProps {
  onLoggedIn: (token: string, user: AdminUserVm) => void;
}

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="admin-login">
      <span className="eyebrow">Admin portal</span>
      <h1>Onboarding compliance console</h1>
      <p>Sign in with an authorized HR or compliance administrator account.</p>
      {mode === "local" ? (
        <form onSubmit={handleSubmit} className="admin-login__form">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Admin email" autoComplete="username" />
          <input
            value={password}
            type="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
          <button type="submit" disabled={loading || !email || !password}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      ) : (
        <p>Enterprise identity sign-in is configured for this tenant.</p>
      )}
      {error ? <p className="admin-error">{error}</p> : null}
    </main>
  );
}
