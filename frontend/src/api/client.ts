import {
  fetchEmployeeResponse,
  type EmployeeApiSession
} from "./employeeTransport";

export interface AssistantQuery {
  message: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

// Thin API client for the protected planner-based assistant endpoint.
export async function sendAssistantQuery(payload: AssistantQuery, session: EmployeeApiSession): Promise<Response> {
  return fetchEmployeeResponse("/agent/goal-execute", session, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    tenantId: payload.tenantId ?? session.tenantId,
    body: JSON.stringify({
      ...payload,
      tenantId: payload.tenantId ?? session.tenantId
    })
  });
}
