export interface AssistantQuery {
  message: string;
  tenantId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

// Thin API client for the current planner-based assistant endpoint.
export async function sendAssistantQuery(payload: AssistantQuery): Promise<Response> {
  return fetch("/api/agent/goal-execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer demo-user|tenant-acme",
      "x-tenant-id": "tenant-acme"
    },
    body: JSON.stringify(payload)
  });
}
