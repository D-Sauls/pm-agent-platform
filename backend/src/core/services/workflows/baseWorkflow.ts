import type { ChangeAssessmentResult } from "../../models/changeAssessmentModels.js";
import type { ComplianceAuditResult, RequirementStatusResult } from "../../models/complianceModels.js";
import type { DeliveryAdvisorResult } from "../../models/deliveryAdvisorModels.js";
import type { ForecastWorkflowResult } from "../../models/forecastWorkflowModels.js";
import type {
  CourseRecommendationResult,
  KnowledgeDocumentSummaryResult,
  KnowledgeExplainResult,
  LearningProgressResult,
  PolicyLookupResult,
  SharePointDocumentLookupResult
} from "../../models/knowledgeModels.js";
import type {
  NextTrainingStepResult,
  OnboardingRecommendationResult,
  RoleKnowledgeLookupResult
} from "../../models/onboardingModels.js";
import type { NormalizedProjectContext, WeeklyReportOutput } from "../../models/projectModels.js";
import type { ProjectSummaryResult } from "../../models/projectSummaryModels.js";
import type { RaidExtractionResult } from "../../models/raidModels.js";
import type { TenantContext } from "../../models/tenantModels.js";
import type { MonthlyBillingSummaryResult, WeeklyTimeReportResult } from "../../models/timeWorkflowModels.js";

export type WorkflowId =
  | "weekly_report"
  | "raid_extraction"
  | "change_assessment"
  | "delivery_advisor"
  | "forecast"
  | "weekly_time_report"
  | "monthly_billing_summary"
  | "project_summary"
  | "course_recommendation"
  | "policy_lookup"
  | "learning_progress"
  | "knowledge_explain"
  | "sharepoint_document_lookup"
  | "knowledge_document_summary"
  | "onboarding_recommendation"
  | "next_training_step"
  | "role_knowledge_lookup"
  | "compliance_audit"
  | "requirement_status";

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
    | "delivery_advisor"
    | "forecast"
    | "weekly_time_report"
    | "monthly_billing_summary"
    | "project_summary"
    | "course_recommendation"
    | "policy_lookup"
    | "learning_progress"
    | "knowledge_explain"
    | "sharepoint_document_lookup"
    | "knowledge_document_summary"
    | "onboarding_recommendation"
    | "next_training_step"
    | "role_knowledge_lookup"
    | "compliance_audit"
    | "requirement_status"
    | "advice"
    | "summary";
  data:
    | WeeklyReportOutput
    | ChangeAssessmentResult
    | DeliveryAdvisorResult
    | ForecastWorkflowResult
    | WeeklyTimeReportResult
    | MonthlyBillingSummaryResult
    | ProjectSummaryResult
    | CourseRecommendationResult
    | PolicyLookupResult
    | SharePointDocumentLookupResult
    | KnowledgeDocumentSummaryResult
    | LearningProgressResult
    | KnowledgeExplainResult
    | OnboardingRecommendationResult
    | NextTrainingStepResult
    | RoleKnowledgeLookupResult
    | ComplianceAuditResult
    | RequirementStatusResult
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
