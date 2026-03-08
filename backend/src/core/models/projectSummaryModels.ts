export interface ProjectSummaryInput {
  tenantId: string;
  projectId?: string;
  message?: string;
  contextType?: "project_summary" | "executive_summary" | "status_summary";
  metadata?: Record<string, unknown>;
}

export interface ProjectSummaryResult {
  workflowId: "project_summary";
  resultType: "project_summary";
  projectOverview: string;
  deliveryHealth: "green" | "amber" | "red" | "unknown";
  progressSummary: string;
  keyAchievements: string[];
  risksIssues: string[];
  blockers: string[];
  upcomingMilestones: string[];
  recommendedFocus: string[];
  assumptionsMade: string[];
  warnings: string[];
  generatedAt: Date;
}
