import { useEffect, useState } from "react";
import { app } from "@microsoft/teams-js";
import { ChatPanel } from "../components/ChatPanel";

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
    <main className="teams-assistant-shell">
      <header className="teams-assistant-shell__header">
        <h1>Learning and Compliance Assistant</h1>
        <p>{isTeamsContext ? "Running in Teams" : "Running in Browser"}</p>
      </header>
      <section className="teams-assistant-shell__body">
        <ChatPanel />
      </section>
    </main>
  );
}
