import { FormEvent, useState } from "react";
import { sendAssistantQuery } from "../api/client";

interface WeeklyReportViewModel {
  projectSummary: string;
  achievementsThisPeriod: string[];
  upcomingWork: string[];
  risksIssues: string[];
  dependencies: string[];
  decisionsRequired: string[];
  overallRagStatus: "Red" | "Amber" | "Green";
}

interface AssistantResponse {
  operation: string;
  connectorUsed?: string;
  weeklyReport?: WeeklyReportViewModel;
}

// Chat UI for weekly report requests.
export function ChatPanel() {
  const [message, setMessage] = useState("Generate weekly report");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const requestType = message.toLowerCase().includes("generate weekly report")
        ? "weekly_highlight_report"
        : undefined;
      const response = await sendAssistantQuery({
        projectId: "project-alpha",
        userInput: message,
        deliveryMode: "HybridPrince2Agile",
        requestType
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const body = (await response.json()) as AssistantResponse;
      setResult(body);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ border: "1px solid #ccc", padding: 12, borderRadius: 8 }}>
      <h2>Assistant Chat</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type: Generate weekly report"
          style={{ padding: 8 }}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Send"}
        </button>
      </form>

      {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}

      {result?.weeklyReport ? (
        <article style={{ marginTop: 12, border: "1px solid #d6d6d6", borderRadius: 8, padding: 12 }}>
          <h3>Weekly Project Highlight Report</h3>
          <p>
            <strong>Connector:</strong> {result.connectorUsed ?? "internal-model"}
          </p>
          <p>
            <strong>Project Summary:</strong> {result.weeklyReport.projectSummary}
          </p>
          <p>
            <strong>Overall RAG Status:</strong> {result.weeklyReport.overallRagStatus}
          </p>
          <p>
            <strong>Achievements This Period:</strong> {result.weeklyReport.achievementsThisPeriod.join("; ")}
          </p>
          <p>
            <strong>Upcoming Work:</strong> {result.weeklyReport.upcomingWork.join("; ")}
          </p>
          <p>
            <strong>Risks / Issues:</strong> {result.weeklyReport.risksIssues.join("; ")}
          </p>
          <p>
            <strong>Dependencies:</strong> {result.weeklyReport.dependencies.join("; ")}
          </p>
          <p>
            <strong>Decisions Required:</strong> {result.weeklyReport.decisionsRequired.join("; ")}
          </p>
        </article>
      ) : null}
    </section>
  );
}
