import type { ResourceEffortSummary, TaskEffortSummary } from "./timeModels.js";

export interface WeeklyTimeReportInput {
  tenantId: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface WeeklyTimeReportResult {
  workflowId: "weekly_time_report";
  resultType: "weekly_time_report";
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  unknownHours: number;
  billableRatio: number;
  resourceBreakdown: ResourceEffortSummary[];
  taskBreakdown: TaskEffortSummary[];
  recommendations: string[];
  generatedAt: Date;
}

export interface MonthlyBillingSummaryInput {
  tenantId: string;
  projectId?: string;
  month?: number;
  year?: number;
}

export interface MonthlyBillingSummaryResult {
  workflowId: "monthly_billing_summary";
  resultType: "monthly_billing_summary";
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  unknownHours: number;
  billableRatio: number;
  utilizationAverage?: number;
  resourceBreakdown: ResourceEffortSummary[];
  projectBreakdown?: Array<{
    projectId: string;
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    unknownHours: number;
    billableRatio: number;
  }>;
  recommendations: string[];
  generatedAt: Date;
}
