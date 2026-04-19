export type UsageRequestType =
  | "agent_goal_execute"
  | "admin_policy_publish"
  | "admin_course_publish"
  | "hr_import_process"
  | string;

export interface UsageLog {
  requestId?: string;
  correlationId?: string;
  tenantId: string;
  requestType: UsageRequestType;
  workflowId?: string;
  timestamp: string;
  connectorUsed: string;
  responseTime: number;
  success?: boolean;
  errorMessage?: string;
}
