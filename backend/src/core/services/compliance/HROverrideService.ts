import { AppError } from "../../errors/AppError.js";
import type {
  AcknowledgementRecord,
  ComplianceConfig,
  HROverrideRecord
} from "../../models/complianceModels.js";
import { loggingService } from "../../../observability/runtime.js";

export class HROverrideService {
  private readonly overrides: HROverrideRecord[] = [];

  createOverride(
    override: HROverrideRecord,
    config: ComplianceConfig
  ): { override: HROverrideRecord; acknowledgement: AcknowledgementRecord } {
    if (!config.hrOverrideEnabled) {
      throw new AppError("UNAUTHORIZED", "HR override is disabled for this tenant", 403);
    }

    this.overrides.push(override);
    loggingService.info("compliance.hr_override.recorded", {
      tenantId: override.tenantId,
      actorId: override.overriddenBy,
      actorRole: "supportadmin",
      subjectType: override.subjectType,
      subjectId: override.subjectId
    });
    return {
      override,
      acknowledgement: {
        id: `ack-${override.id}`,
        tenantId: override.tenantId,
        userId: override.userId,
        subjectType: override.subjectType,
        subjectId: override.subjectId,
        subjectVersionId: override.subjectVersionId ?? null,
        acknowledgementType: "hr_override",
        status: "completed",
        actorId: override.overriddenBy,
        actorRole: "supportadmin",
        recordedAt: override.recordedAt,
        notes: override.reason
      }
    };
  }

  listOverrides(tenantId: string): HROverrideRecord[] {
    return this.overrides.filter((record) => record.tenantId === tenantId);
  }
}
