import { randomUUID } from "node:crypto";
import type { FileHrImportRepository } from "./FileHrImportRepository.js";

export class ImportAuditService {
  constructor(private readonly repository: FileHrImportRepository) {}

  record(
    tenantId: string,
    action: string,
    importJobId?: string,
    details?: Record<string, unknown>
  ): void {
    this.repository.appendAudit({
      id: randomUUID(),
      tenantId,
      importJobId,
      action,
      details,
      createdAt: new Date()
    });
  }
}
