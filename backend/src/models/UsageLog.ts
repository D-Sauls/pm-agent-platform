import type { AgentOperation } from "../orchestration/types.js";

export interface UsageLog {
  tenantId: string;
  requestType: AgentOperation | string;
  workflowId?: string;
  timestamp: string;
  connectorUsed: string;
  responseTime: number;
  success?: boolean;
  errorMessage?: string;
}
