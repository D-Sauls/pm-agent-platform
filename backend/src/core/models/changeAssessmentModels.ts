export type ChangeSourceType =
  | "client_request"
  | "internal_request"
  | "governance_request"
  | "generic";

export interface ChangeAssessmentInput {
  tenantId: string;
  projectId?: string;
  changeText: string;
  sourceType?: ChangeSourceType;
  requestedBy?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ChangeImpactAssessment {
  scopeClassification: "in_scope" | "out_of_scope" | "requires_review";
  scheduleImpact: "low" | "medium" | "high" | "unknown";
  effortImpact: "low" | "medium" | "high" | "unknown";
  costImpact: "low" | "medium" | "high" | "unknown";
  deliveryRisk: "low" | "medium" | "high" | "unknown";
  dependencyImpact: string[];
  governanceImpact: string[];
  assumptionsMade: string[];
  decisionRequired: string | null;
  recommendedNextStep: string | null;
  confidence?: number | null;
}

export interface ChangeAssessmentResult {
  workflowId: string;
  resultType: "change_assessment";
  changeSummary: string;
  impactAssessment: ChangeImpactAssessment;
  warnings: string[];
  generatedAt: Date;
}
