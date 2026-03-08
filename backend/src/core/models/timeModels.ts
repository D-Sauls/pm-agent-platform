export type BillableStatus = "billable" | "non_billable" | "unknown";

export interface TimeEntry {
  timeEntryId: string;
  tenantId: string;
  projectId: string;
  taskId?: string | null;
  sourceSystem: string;
  externalTimeEntryId?: string | null;
  userId?: string | null;
  userDisplayName?: string | null;
  entryDate: Date;
  hours: number;
  minutes?: number | null;
  billableStatus: BillableStatus;
  billingCategory?: string | null;
  description?: string | null;
  tags?: string[];
}

export interface Resource {
  userId: string;
  tenantId: string;
  displayName: string;
  role?: string | null;
  team?: string | null;
  defaultBillableStatus?: BillableStatus;
}

export interface EffortSummary {
  tenantId: string;
  projectId?: string | null;
  periodStart: Date;
  periodEnd: Date;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  unknownHours: number;
  billableRatio: number;
  nonBillableRatio: number;
}

export interface ResourceEffortSummary {
  userId: string;
  displayName?: string | null;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  utilizationPercent?: number | null;
}

export interface TaskEffortSummary {
  taskId?: string | null;
  taskTitle?: string | null;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
}
