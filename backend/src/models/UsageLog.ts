import type { AgentOperation } from "../orchestration/types.js";

export interface UsageLog {
  tenantId: string;
  requestType: AgentOperation;
  timestamp: string;
  connectorUsed: string;
  responseTime: number;
}
