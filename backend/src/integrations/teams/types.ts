import type { AgenticExecutionResponse } from "../../core/models/agenticModels.js";

export interface TeamsActivity {
  type: string;
  id?: string;
  text?: string;
  value?: Record<string, unknown>;
  from?: {
    id?: string;
    name?: string;
    aadObjectId?: string;
  };
  conversation?: {
    id?: string;
  };
  channelData?: {
    tenant?: {
      id?: string;
    };
    [key: string]: unknown;
  };
}

export interface TeamsUserContext {
  platformTenantId: string;
  teamsTenantId: string | null;
  teamsUserId: string;
  displayName?: string;
}

export interface TeamsMessageRouteResult {
  tenantId: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface AgentExecutor {
  goalExecute(input: {
    tenantId: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<AgenticExecutionResponse>;
}
