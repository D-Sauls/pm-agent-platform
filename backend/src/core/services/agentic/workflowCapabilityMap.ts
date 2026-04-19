import type { WorkflowId } from "../workflows/baseWorkflow.js";

export interface WorkflowCapability {
  workflowId: WorkflowId;
  capabilities: string[];
}

export const workflowCapabilityMap: WorkflowCapability[] = [
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
