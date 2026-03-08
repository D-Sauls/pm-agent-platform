import type { AgentOperation } from "../orchestration/types.js";

export interface UsageLog {
  requestId?: string;
  correlationId?: string;
  tenantId: string;
  requestType: AgentOperation | string;
  workflowId?: string;
  timestamp: string;
  connectorUsed: string;
  responseTime: number;
  success?: boolean;
  errorMessage?: string;
}
