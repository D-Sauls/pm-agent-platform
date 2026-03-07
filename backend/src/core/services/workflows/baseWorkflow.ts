import type { ChangeAssessmentResult } from "../../models/changeAssessmentModels.js";
import type { NormalizedProjectContext, WeeklyReportOutput } from "../../models/projectModels.js";
import type { RaidExtractionResult } from "../../models/raidModels.js";
import type { TenantContext } from "../../models/tenantModels.js";

export type WorkflowId =
  | "weekly_report"
  | "raid_extraction"
  | "change_assessment"
  | "delivery_advisor"
  | "project_summary";

export interface AgentExecutionContext {
  tenantContext: TenantContext;
  projectContext: NormalizedProjectContext;
  userRequest: string;
  workflowId: WorkflowId;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface WorkflowResult {
  workflowId: WorkflowId;
  resultType:
    | "report"
    | "raid"
    | "raid_extraction"
    | "assessment"
    | "change_assessment"
    | "advice"
    | "summary";
  data:
    | WeeklyReportOutput
    | ChangeAssessmentResult
    | RaidExtractionResult
    | {
        summary?: string;
        risks?: string[];
        issues?: string[];
        assumptions?: string[];
        dependencies?: string[];
        recommendation?: string;
        actions?: string[];
      };
  generatedAt: Date;
  confidenceScore: number;
  warnings: string[];
}

export interface BaseWorkflow {
  id: WorkflowId;
  name: string;
  description: string;
  supportedInputTypes: string[];
  execute(context: AgentExecutionContext): Promise<WorkflowResult>;
}
