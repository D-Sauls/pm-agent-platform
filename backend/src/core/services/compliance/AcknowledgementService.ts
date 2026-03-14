import { AppError } from "../../errors/AppError.js";
import type {
  AcknowledgementRecord,
  AcknowledgementType,
  ComplianceConfig
} from "../../models/complianceModels.js";
import { loggingService } from "../../../observability/runtime.js";

export class AcknowledgementService {
  private acknowledgements: AcknowledgementRecord[] = [];

  recordAcknowledgement(
    record: AcknowledgementRecord,
    config: ComplianceConfig,
    signatureRequired: boolean
  ): AcknowledgementRecord {
    this.validateAcknowledgement(record.acknowledgementType, config, signatureRequired);
    this.acknowledgements.push(record);
    loggingService.info("compliance.acknowledgement.recorded", {
      tenantId: record.tenantId,
      actorId: record.actorId ?? record.userId,
      actorRole: record.actorRole ?? "user",
      subjectType: record.subjectType,
      subjectId: record.subjectId
    });
    return record;
  }

  listByTenant(tenantId: string): AcknowledgementRecord[] {
    return this.acknowledgements.filter((record) => record.tenantId === tenantId);
  }

  findHistory(filters: {
    tenantId: string;
    userId?: string;
    subjectType?: AcknowledgementRecord["subjectType"];
    subjectId?: string;
  }): AcknowledgementRecord[] {
    return this.acknowledgements.filter((record) => {
      if (record.tenantId !== filters.tenantId) return false;
      if (filters.userId && record.userId !== filters.userId) return false;
      if (filters.subjectType && record.subjectType !== filters.subjectType) return false;
      if (filters.subjectId && record.subjectId !== filters.subjectId) return false;
      return true;
    });
  }

  replaceAcknowledgementsForTenant(tenantId: string, nextRecords: AcknowledgementRecord[]): void {
    this.acknowledgements = [
      ...this.acknowledgements.filter((record) => record.tenantId !== tenantId),
      ...nextRecords
    ];
  }

  private validateAcknowledgement(
    acknowledgementType: AcknowledgementType,
    config: ComplianceConfig,
    signatureRequired: boolean
  ): void {
    if (signatureRequired && !["signed", "hr_override"].includes(acknowledgementType)) {
      throw new AppError("VALIDATION_ERROR", "Signed acknowledgement is required for this subject", 400);
    }
    if (config.readReceiptMode === "signature_tracking" && acknowledgementType === "opened") {
      throw new AppError("VALIDATION_ERROR", "Open tracking is insufficient under signature tracking mode", 400);
    }
  }
}
