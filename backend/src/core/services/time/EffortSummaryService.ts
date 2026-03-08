import type {
  EffortSummary,
  Resource,
  ResourceEffortSummary,
  TaskEffortSummary,
  TimeEntry
} from "../../models/timeModels.js";
import { UtilizationService } from "./UtilizationService.js";

export interface EffortSummaryFilter {
  tenantId: string;
  projectId?: string;
  userId?: string;
  startDate: Date;
  endDate: Date;
}

export interface EffortSummaryResult {
  summary: EffortSummary;
  resourceSummary: ResourceEffortSummary[];
  taskSummary: TaskEffortSummary[];
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

export class EffortSummaryService {
  constructor(private readonly utilizationService: UtilizationService = new UtilizationService()) {}

  summarize(
    filter: EffortSummaryFilter,
    entries: TimeEntry[],
    resources: Resource[] = [],
    availableHoursByUser: Record<string, number> = {}
  ): EffortSummaryResult {
    const filtered = entries.filter((entry) => this.matches(entry, filter));
    const summary = this.buildSummary(filter, filtered);
    const resourceSummary = this.buildResourceSummary(filtered, resources);
    const taskSummary = this.buildTaskSummary(filtered);

    return {
      summary,
      resourceSummary: this.utilizationService.applyUtilization(resourceSummary, availableHoursByUser),
      taskSummary
    };
  }

  getWeeklyRange(referenceDate: Date): { startDate: Date; endDate: Date } {
    const day = referenceDate.getDay();
    const deltaToMonday = day === 0 ? -6 : 1 - day;
    const startDate = new Date(referenceDate);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(referenceDate.getDate() + deltaToMonday);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  getMonthlyRange(referenceDate: Date): { startDate: Date; endDate: Date } {
    const startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 0, 0, 0, 0);
    const endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }

  private buildSummary(filter: EffortSummaryFilter, entries: TimeEntry[]): EffortSummary {
    const totalHours = entries.reduce((acc, entry) => acc + entry.hours, 0);
    const billableHours = entries
      .filter((entry) => entry.billableStatus === "billable")
      .reduce((acc, entry) => acc + entry.hours, 0);
    const nonBillableHours = entries
      .filter((entry) => entry.billableStatus === "non_billable")
      .reduce((acc, entry) => acc + entry.hours, 0);
    const unknownHours = Math.max(0, totalHours - billableHours - nonBillableHours);

    return {
      tenantId: filter.tenantId,
      projectId: filter.projectId ?? null,
      periodStart: filter.startDate,
      periodEnd: filter.endDate,
      totalHours: round(totalHours),
      billableHours: round(billableHours),
      nonBillableHours: round(nonBillableHours),
      unknownHours: round(unknownHours),
      billableRatio: totalHours > 0 ? round(billableHours / totalHours) : 0,
      nonBillableRatio: totalHours > 0 ? round(nonBillableHours / totalHours) : 0
    };
  }

  private buildResourceSummary(entries: TimeEntry[], resources: Resource[]): ResourceEffortSummary[] {
    const resourceById = new Map(resources.map((resource) => [resource.userId, resource]));
    const byUser = new Map<string, ResourceEffortSummary>();

    for (const entry of entries) {
      const userId = entry.userId ?? "unknown-user";
      const current = byUser.get(userId) ?? {
        userId,
        displayName: entry.userDisplayName ?? resourceById.get(userId)?.displayName ?? null,
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
        utilizationPercent: null
      };
      current.totalHours += entry.hours;
      if (entry.billableStatus === "billable") {
        current.billableHours += entry.hours;
      }
      if (entry.billableStatus === "non_billable") {
        current.nonBillableHours += entry.hours;
      }
      byUser.set(userId, current);
    }

    return Array.from(byUser.values()).map((item) => ({
      ...item,
      totalHours: round(item.totalHours),
      billableHours: round(item.billableHours),
      nonBillableHours: round(item.nonBillableHours)
    }));
  }

  private buildTaskSummary(entries: TimeEntry[]): TaskEffortSummary[] {
    const byTask = new Map<string, TaskEffortSummary>();

    for (const entry of entries) {
      const taskId = entry.taskId ?? null;
      const key = taskId ?? "unmapped-task";
      const current = byTask.get(key) ?? {
        taskId,
        taskTitle: null,
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0
      };
      current.totalHours += entry.hours;
      if (entry.billableStatus === "billable") {
        current.billableHours += entry.hours;
      }
      if (entry.billableStatus === "non_billable") {
        current.nonBillableHours += entry.hours;
      }
      byTask.set(key, current);
    }

    return Array.from(byTask.values()).map((item) => ({
      ...item,
      totalHours: round(item.totalHours),
      billableHours: round(item.billableHours),
      nonBillableHours: round(item.nonBillableHours)
    }));
  }

  private matches(entry: TimeEntry, filter: EffortSummaryFilter): boolean {
    if (entry.tenantId !== filter.tenantId) return false;
    if (filter.projectId && entry.projectId !== filter.projectId) return false;
    if (filter.userId && entry.userId !== filter.userId) return false;
    if (entry.entryDate.getTime() < filter.startDate.getTime()) return false;
    if (entry.entryDate.getTime() > filter.endDate.getTime()) return false;
    return true;
  }
}
