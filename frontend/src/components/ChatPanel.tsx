import { FormEvent, useState } from "react";
import { sendAssistantQuery } from "../api/client";

interface AssistantResponse {
  response?: {
    synthesizedSummary: string;
    keyFindings: string[];
    recommendedActions: string[];
    warnings: string[];
    workflowsExecuted: string[];
  };
  goalType?: string;
}

// Teams-friendly assistant panel backed by the planner-based agent endpoint.
export function ChatPanel() {
  const [message, setMessage] = useState("What training or compliance task should I complete next?");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await sendAssistantQuery({
        tenantId: "tenant-acme",
        message,
        metadata: { surface: "teams" }
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
          placeholder="Ask about training, policies, or compliance"
          style={{ padding: 8 }}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Send"}
        </button>
      </form>

      {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}

      {result?.response ? (
        <article style={{ marginTop: 12, border: "1px solid #d6d6d6", borderRadius: 8, padding: 12 }}>
          <h3>{result.goalType ?? "Assistant response"}</h3>
          <p>{result.response.synthesizedSummary}</p>
          <p><strong>Recommended actions:</strong> {result.response.recommendedActions.join("; ")}</p>
          <p><strong>Workflows:</strong> {result.response.workflowsExecuted.join(", ")}</p>
        </article>
      ) : null}
    </section>
  );
}
