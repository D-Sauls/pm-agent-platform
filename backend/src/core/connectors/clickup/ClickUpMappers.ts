import type { ConnectorConfig } from "../../models/connectorModels.js";
import type { Milestone, Project, Task } from "../../models/projectModels.js";
import type { TimeEntry } from "../../models/timeModels.js";
import type {
  ClickUpListResponse,
  ClickUpTaskResponse,
  ClickUpTimeEntryResponse
} from "./ClickUpClient.js";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return new Date(numeric);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function mapClickUpProject(
  tenantId: string,
  list: ClickUpListResponse,
  config: ConnectorConfig
): Project {
  return {
    projectId: config.listId ?? list.id,
    tenantId,
    sourceSystem: "clickup",
    externalProjectId: list.id,
    name: list.name,
    summary: `Space: ${list.space?.name ?? "n/a"}; Folder: ${list.folder?.name ?? "n/a"}`,
    deliveryMode: "hybrid",
    status: list.status?.status ?? "Unknown"
  };
}

export function mapClickUpTask(projectId: string, task: ClickUpTaskResponse): Task {
  return {
    taskId: task.id,
    projectId,
    sourceSystem: "clickup",
    title: task.name,
    description: task.description ?? "",
    status: task.status?.status ?? "Unknown",
    assignee: task.assignees?.[0]?.username ?? null,
    dueDate: parseDate(task.due_date),
    priority: task.priority?.priority ?? null
  };
}

export function mapClickUpMilestone(projectId: string, task: ClickUpTaskResponse): Milestone {
  return {
    milestoneId: task.id,
    projectId,
    sourceSystem: "clickup",
    title: task.name,
    targetDate: parseDate(task.due_date),
    status: task.status?.status ?? "Unknown"
  };
}

export function mapClickUpTimeEntry(
  tenantId: string,
  projectId: string,
  entry: ClickUpTimeEntryResponse
): TimeEntry {
  const durationMs = Number(entry.duration ?? 0);
  const hours = Number((durationMs / 3_600_000).toFixed(2));
  const minutes = Number(((durationMs % 3_600_000) / 60_000).toFixed(0));

  return {
    timeEntryId: entry.id,
    tenantId,
    projectId,
    taskId: entry.task?.id ?? null,
    sourceSystem: "clickup",
    externalTimeEntryId: entry.id,
    userId: entry.user?.id ?? null,
    userDisplayName: entry.user?.username ?? null,
    entryDate: parseDate(entry.start) ?? new Date(),
    hours,
    minutes,
    billableStatus: entry.billable ? "billable" : "unknown",
    billingCategory: null,
    description: entry.description ?? null,
    tags: (entry.tags ?? []).map((tag) => tag.name)
  };
}

export function mapClickUpStatus(tasks: Task[]): string {
  if (tasks.length === 0) return "Unknown";
  const doneCount = tasks.filter((task) =>
    ["done", "closed", "complete", "completed"].includes((task.status ?? "").toLowerCase())
  ).length;
  const ratio = doneCount / tasks.length;
  if (ratio >= 0.8) return "Green";
  if (ratio >= 0.5) return "Amber";
  return "Red";
}
