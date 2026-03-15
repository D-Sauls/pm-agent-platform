import type { WorkflowId } from "../workflows/baseWorkflow.js";

export interface WorkflowCapability {
  workflowId: WorkflowId;
  capabilities: string[];
}

export const workflowCapabilityMap: WorkflowCapability[] = [
  { workflowId: "project_summary", capabilities: ["executive summary", "overview", "project status", "leadership summary"] },
  { workflowId: "delivery_advisor", capabilities: ["pm priorities", "blockers", "next actions", "delivery focus"] },
  { workflowId: "forecast", capabilities: ["delivery trend", "capacity risk", "billing trend", "on track assessment"] },
  { workflowId: "weekly_time_report", capabilities: ["weekly billable effort", "weekly utilization", "time breakdown"] },
  { workflowId: "monthly_billing_summary", capabilities: ["monthly billing", "billable trend", "utilization summary"] },
  { workflowId: "change_assessment", capabilities: ["scope change analysis", "change governance", "in-scope assessment"] },
  { workflowId: "raid_extraction", capabilities: ["notes to raid", "risk extraction", "dependency extraction"] },
  { workflowId: "weekly_report", capabilities: ["weekly highlights", "status report", "project report"] },
  { workflowId: "course_recommendation", capabilities: ["learning path", "role-based training", "onboarding courses"] },
  { workflowId: "onboarding_recommendation", capabilities: ["onboarding path", "role onboarding", "training checklist"] },
  { workflowId: "next_training_step", capabilities: ["next step", "what should i complete next", "onboarding progress"] },
  { workflowId: "role_knowledge_lookup", capabilities: ["role policies", "role knowledge", "role learning resources"] },
  { workflowId: "policy_lookup", capabilities: ["policy search", "policy retrieval", "compliance reference"] },
  { workflowId: "learning_progress", capabilities: ["completion tracking", "training status", "learning progress"] },
  { workflowId: "knowledge_explain", capabilities: ["policy explanation", "lesson explanation", "knowledge guidance"] },
  { workflowId: "sharepoint_document_lookup", capabilities: ["sharepoint document search", "microsoft 365 document retrieval", "document lookup"] },
  { workflowId: "knowledge_document_summary", capabilities: ["document summary", "sharepoint summary", "corporate document explanation"] },
  { workflowId: "compliance_audit", capabilities: ["compliance gaps", "overdue training", "acknowledgement audit"] },
  { workflowId: "requirement_status", capabilities: ["user compliance status", "training status", "requirement status"] }
];
