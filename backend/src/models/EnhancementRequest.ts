export type EnhancementStatus = "new" | "under_review" | "planned" | "declined" | "delivered";

export interface EnhancementRequest {
  id: string;
  tenantId: string;
  submittedBy: string;
  title: string;
  description: string;
  expectedBenefit: string;
  urgency: "low" | "medium" | "high" | "critical";
  currentWorkaround: string;
  status: EnhancementStatus;
  createdDate: string;
  internalNotes: string;
}
