export interface AssistantQuery {
  projectId: string;
  userInput: string;
  deliveryMode: "Waterfall" | "AgileLean" | "HybridPrince2Agile";
  requestType?:
    | "weekly_highlight_report"
    | "raid_extraction"
    | "change_request_assessment"
    | "next_pm_actions";
}

// Thin API client for backend agent endpoints.
export async function sendAssistantQuery(payload: AssistantQuery): Promise<Response> {
  return fetch("/api/agent/respond", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer demo-user|tenant-acme",
      "x-tenant-id": "tenant-acme"
    },
    body: JSON.stringify(payload)
  });
}
