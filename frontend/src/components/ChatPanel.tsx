import { FormEvent, useState } from "react";
import { sendAssistantQuery } from "../api/client";
import { assistantDemoPrompts, defaultAssistantDemoResponse, getAssistantDemoResult } from "../assistantDemoData";
import {
  hasEmployeeSession,
  loadEmployeeSession,
  toEmployeeSessionAccess
} from "../session/employeeSession";

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

function formatGoalType(goalType?: string): string {
  if (!goalType) {
    return "Assistant response";
  }
  return goalType
    .replace(/_demo$/, "")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Teams-friendly assistant panel. It uses demo data until a real activated employee session exists.
export function ChatPanel() {
  const [message, setMessage] = useState("What training or compliance task should I complete next?");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session] = useState(() => loadEmployeeSession());
  const [result, setResult] = useState<AssistantResponse | null>({
    goalType: "next_training_step_demo",
    response: defaultAssistantDemoResponse
  });
  const hasLiveAssistantSession = hasEmployeeSession(session);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!hasLiveAssistantSession) {
      setResult(getAssistantDemoResult(message));
      setLoading(false);
      return;
    }

    try {
      const response = await sendAssistantQuery(
        {
          tenantId: session.tenantId,
          message,
          metadata: {
            surface: "teams",
            userId: session.userId,
            role: session.role,
            department: session.department
          }
        },
        toEmployeeSessionAccess(session)
      );

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}.`);
      }

      const body = (await response.json()) as AssistantResponse;
      setResult(body);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? `${submitError.message} Showing safe demo data.`
          : "Live assistant unavailable. Showing safe demo data."
      );
      setResult(getAssistantDemoResult(message, true));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="assistant-panel">
      <h2>Assistant Chat</h2>
      <p className="assistant-panel__intro">
        {hasLiveAssistantSession
          ? "Live assistant mode is using your activated employee session."
          : "Smart demo mode: ask natural questions about assigned courses, role purpose, policies, and compliance. It uses sample onboarding data until a live employee session is available."}
      </p>
      <div className="assistant-panel__prompts">
        {assistantDemoPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              setMessage(prompt);
              setError(null);
              setResult(getAssistantDemoResult(prompt));
            }}
            className="assistant-panel__prompt"
          >
            {prompt}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="assistant-panel__form">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask about training, policies, or compliance"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Send"}
        </button>
      </form>

      {error ? <p className="assistant-panel__error">{error}</p> : null}

      {result?.response ? (
        <article className="assistant-panel__response">
          <h3>{formatGoalType(result.goalType)}</h3>
          <p>{result.response.synthesizedSummary}</p>
          <ResponseList title="Key findings" items={result.response.keyFindings} />
          <ResponseList title="Recommended actions" items={result.response.recommendedActions} />
          {result.response.warnings.length > 0 ? <ResponseList title="Notes" items={result.response.warnings} /> : null}
          <p className="assistant-panel__reasoning">
            <strong>Reasoning path:</strong> {result.response.workflowsExecuted.map(formatGoalType).join(", ")}
          </p>
        </article>
      ) : null}
    </section>
  );
}

function ResponseList(props: { title: string; items: string[] }) {
  return (
    <div className="assistant-panel__list">
      <strong>{props.title}</strong>
      <ul>
        {props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
