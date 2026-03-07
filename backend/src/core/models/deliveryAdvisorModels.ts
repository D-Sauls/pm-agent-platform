export type DeliveryContextType = "delivery_advice" | "risk_review" | "priority_review";

export interface DeliveryAdvisorInput {
  tenantId: string;
  projectId?: string;
  message?: string;
  contextType?: DeliveryContextType;
  metadata?: Record<string, unknown>;
}

export interface DeliveryPriority {
  title: string;
  description: string;
  category: "risk" | "blocker" | "governance" | "delivery" | "dependency";
  urgency: "low" | "medium" | "high";
  recommendedAction: string;
  confidence?: number;
}

export interface DeliveryAdvisorResult {
  workflowId: string;
  resultType: "delivery_advisor";
  priorities: DeliveryPriority[];
  risks: string[];
  blockers: string[];
  governanceReminders: string[];
  upcomingMilestones: string[];
  assumptionsMade: string[];
  warnings: string[];
  generatedAt: Date;
}
