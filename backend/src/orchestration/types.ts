import type {
  DeliveryMode,
  WeeklyHighlightReport,
  ChangeRequest,
  RaidLog
} from "../../../models/entities.js";
import type { PromptTemplateKey } from "../prompt/PromptEngine.js";

export type AgentOperation =
  | "weekly_highlight_report"
  | "raid_extraction"
  | "change_request_assessment"
  | "next_pm_actions";

export interface OrchestrationInput {
  tenantId?: string;
  projectId: string;
  userInput: string;
  deliveryMode: DeliveryMode;
  requestType?: AgentOperation;
}

export interface OrchestrationOutput {
  operation: AgentOperation;
  promptTemplate: PromptTemplateKey;
  narrativeResponse: string;
  generatedAt: string;
  connectorUsed?: string;
  weeklyReport?: WeeklyHighlightReport;
  raidLog?: RaidLog;
  changeAssessment?: ChangeRequest;
  recommendedActions?: string[];
}
