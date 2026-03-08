import { z } from "zod";
import { AppError } from "../../errors/AppError.js";
import type { Resource } from "../../models/timeModels.js";
import type { ResourceRepository } from "../../repositories/interfaces.js";

const resourceSchema = z.object({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  displayName: z.string().min(1),
  role: z.string().nullable().optional(),
  team: z.string().nullable().optional(),
  defaultBillableStatus: z.enum(["billable", "non_billable", "unknown"]).optional()
});

export class ResourceService {
  constructor(private readonly repository: ResourceRepository) {}

  async upsert(resources: unknown[]): Promise<Resource[]> {
    if (!Array.isArray(resources) || resources.length === 0) {
      throw new AppError("VALIDATION_ERROR", "At least one resource is required", 400);
    }
    const normalized = resources.map((resource) => {
      const parsed = resourceSchema.safeParse(resource);
      if (!parsed.success) {
        throw new AppError("VALIDATION_ERROR", "Invalid resource payload", 400, {
          issues: parsed.error.issues
        });
      }
      return {
        ...parsed.data,
        role: parsed.data.role ?? null,
        team: parsed.data.team ?? null,
        defaultBillableStatus: parsed.data.defaultBillableStatus ?? "unknown"
      } as Resource;
    });
    await this.repository.upsertMany(normalized);
    return normalized;
  }

  async listByTenant(tenantId: string): Promise<Resource[]> {
    return this.repository.listByTenant(tenantId);
  }
}
