export type AuthMode = "login" | "activate";

export type AssistantResponse = {
  synthesizedSummary: string;
  keyFindings: string[];
  recommendedActions: string[];
  warnings: string[];
  workflowsExecuted: string[];
};

export type EmployeeWorkspaceError = {
  message: string;
  retryLabel?: string;
};
