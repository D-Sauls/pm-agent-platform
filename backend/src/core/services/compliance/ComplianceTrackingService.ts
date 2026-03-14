import type {
  AcknowledgementRecord,
  ComplianceConfig,
  ComplianceRequirement,
  ComplianceStatus
} from "../../models/complianceModels.js";

export class ComplianceTrackingService {
  calculateStatuses(input: {
    tenantId: string;
    userId: string;
    requirements: ComplianceRequirement[];
    acknowledgements: AcknowledgementRecord[];
    now?: Date;
    config: ComplianceConfig;
  }): ComplianceStatus[] {
    const now = input.now ?? new Date();
    return input.requirements.map((requirement) => {
      const assignedAt = now;
      const dueDate =
        requirement.dueInDays != null ? new Date(now.getTime() + requirement.dueInDays * 86400_000) : null;
      const matchingAcknowledgements = input.acknowledgements
        .filter(
          (record) =>
            record.userId === input.userId &&
            record.subjectId === requirement.requirementId &&
            record.status === "completed"
        )
        .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
      const latestAcknowledgement = matchingAcknowledgements[0];

      let status: ComplianceStatus["status"] = "assigned";
      if (latestAcknowledgement) {
        status = "completed";
      } else if (requirement.mandatory && dueDate && dueDate.getTime() < now.getTime()) {
        status = "overdue";
      } else if (matchingAcknowledgements.length > 0) {
        status = "in_progress";
      }

      return {
        tenantId: input.tenantId,
        userId: input.userId,
        requirementId: requirement.id,
        status,
        assignedAt,
        dueDate,
        completedAt: latestAcknowledgement?.recordedAt ?? null,
        lastAcknowledgementId: latestAcknowledgement?.id ?? null
      };
    });
  }
}
