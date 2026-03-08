import { z } from "zod";
import { AppError } from "../../errors/AppError.js";
import type { TimeEntry } from "../../models/timeModels.js";
import type { TimeEntryQuery, TimeEntryRepository } from "../../repositories/interfaces.js";
import { BillingClassificationService } from "./BillingClassificationService.js";

const timeEntrySchema = z.object({
  timeEntryId: z.string().min(1),
  tenantId: z.string().min(1),
  projectId: z.string().min(1),
  taskId: z.string().nullable().optional(),
  sourceSystem: z.string().min(1),
  externalTimeEntryId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  userDisplayName: z.string().nullable().optional(),
  entryDate: z.coerce.date(),
  hours: z.number().min(0).max(24),
  minutes: z.number().int().min(0).max(59).nullable().optional(),
  billableStatus: z.enum(["billable", "non_billable", "unknown"]).optional(),
  billingCategory: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional()
});

export interface QueryTimeEntriesInput {
  tenantId: string;
  projectId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class TimeEntryService {
  constructor(
    private readonly repository: TimeEntryRepository,
    private readonly billingClassificationService: BillingClassificationService
  ) {}

  async ingest(entries: unknown[]): Promise<TimeEntry[]> {
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new AppError("VALIDATION_ERROR", "At least one time entry is required", 400);
    }

    const normalized = entries.map((entry) => this.normalizeEntry(entry));
    await this.repository.upsertMany(normalized);
    return normalized;
  }

  async query(input: QueryTimeEntriesInput): Promise<TimeEntry[]> {
    if (!input.tenantId) {
      throw new AppError("VALIDATION_ERROR", "tenantId is required", 400);
    }
    if (input.startDate && input.endDate && input.endDate.getTime() < input.startDate.getTime()) {
      throw new AppError("VALIDATION_ERROR", "endDate must be on or after startDate", 400);
    }

    const query: TimeEntryQuery = {
      tenantId: input.tenantId,
      projectId: input.projectId,
      userId: input.userId,
      startDate: input.startDate,
      endDate: input.endDate
    };
    return this.repository.list(query);
  }

  private normalizeEntry(entry: unknown): TimeEntry {
    const parsed = timeEntrySchema.safeParse(entry);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid time entry payload", 400, {
        issues: parsed.error.issues
      });
    }
    const data = parsed.data;
    const billableStatus = this.billingClassificationService.classify({
      billableStatus: data.billableStatus,
      billingCategory: data.billingCategory ?? undefined,
      description: data.description ?? undefined,
      tags: data.tags
    });

    const minutes = data.minutes ?? null;
    const hours = Number((data.hours + (minutes ? minutes / 60 : 0)).toFixed(2));

    return {
      timeEntryId: data.timeEntryId,
      tenantId: data.tenantId,
      projectId: data.projectId,
      taskId: data.taskId ?? null,
      sourceSystem: data.sourceSystem,
      externalTimeEntryId: data.externalTimeEntryId ?? null,
      userId: data.userId ?? null,
      userDisplayName: data.userDisplayName ?? null,
      entryDate: data.entryDate,
      hours,
      minutes,
      billableStatus,
      billingCategory: data.billingCategory ?? null,
      description: data.description ?? null,
      tags: data.tags ?? []
    };
  }
}
