import { useEffect, useState } from "react";
import { app } from "@microsoft/teams-js";
import { ChatPanel } from "../components/ChatPanel";
import { DashboardPanel } from "../components/DashboardPanel";

// Hosts the assistant experience inside Teams while remaining browser-friendly.
export function TeamsAppShell() {
  const [isTeamsContext, setIsTeamsContext] = useState(false);

  useEffect(() => {
    app
      .initialize()
      .then(() => setIsTeamsContext(true))
      .catch(() => setIsTeamsContext(false));
  }, []);

  return (
    <main style={{ padding: 16, fontFamily: "Segoe UI, sans-serif" }}>
      <h1>Learning and Compliance Assistant</h1>
      <p>{isTeamsContext ? "Running in Teams" : "Running in Browser"}</p>
      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
        <ChatPanel />
        <DashboardPanel />
      </section>
    </main>
  );
}
