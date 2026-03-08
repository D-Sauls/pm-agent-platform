import type { Dependency, Issue, Milestone, Risk, Task } from "./projectModels.js";

export interface TimeEntry {
  timeEntryId: string;
  tenantId: string;
  projectId: string;
  taskId?: string;
  userId?: string;
  date: Date;
  hours: number;
  billable: boolean;
  description?: string;
}

export interface CapacitySnapshot {
  userId: string;
  assignedTasks: number;
  estimatedHours?: number;
  availableHours?: number;
  utilizationPercent?: number;
}

export interface DeliveryTrend {
  overdueTasks: number;
  tasksCompleted: number;
  tasksRemaining: number;
  milestoneVarianceDays?: number;
  dependencyBlockers?: number;
}

export interface EffortSummary {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableRatio: number;
}

export interface ForecastInput {
  tenantId: string;
  projectId?: string;
  tasks: Task[];
  milestones: Milestone[];
  risks?: Risk[];
  issues?: Issue[];
  dependencies?: Dependency[];
  timeEntries?: TimeEntry[];
  projectStartDate?: Date;
  projectEndDate?: Date;
  metadata?: Record<string, unknown>;
}

export interface DeliveryForecast {
  status: "green" | "amber" | "red";
  trend: DeliveryTrend;
  blockers: number;
  milestoneVarianceDays: number;
  riskLevel: "low" | "medium" | "high";
}

export interface CapacityForecast {
  capacityRisk: "low" | "medium" | "high";
  overloadedUsers: string[];
  utilizationAverage: number;
  snapshots: CapacitySnapshot[];
}

export interface BillingForecast extends EffortSummary {
  projectedWeeklyHours: number;
  projectedMonthlyHours: number;
}

export interface ForecastResult {
  deliveryForecast: DeliveryForecast;
  capacityForecast: CapacityForecast;
  billingForecast: BillingForecast;
  confidenceScore: number;
  generatedAt: Date;
}

export interface DeliveryForecastRules {
  amberOverdueTasks: number;
  redOverdueTasks: number;
  amberMilestoneVarianceDays: number;
  redMilestoneVarianceDays: number;
  amberDependencyBlockers: number;
  redDependencyBlockers: number;
}

export const defaultDeliveryForecastRules: DeliveryForecastRules = {
  amberOverdueTasks: 1,
  redOverdueTasks: 4,
  amberMilestoneVarianceDays: 5,
  redMilestoneVarianceDays: 10,
  amberDependencyBlockers: 1,
  redDependencyBlockers: 3
};
