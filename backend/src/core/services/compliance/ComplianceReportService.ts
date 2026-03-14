import type {
  AcknowledgementRecord,
  ComplianceStatus,
  HROverrideRecord
} from "../../models/complianceModels.js";

export class ComplianceReportService {
  tenantSummary(tenantId: string, statuses: ComplianceStatus[]) {
    const tenantStatuses = statuses.filter((status) => status.tenantId === tenantId);
    return {
      tenantId,
      total: tenantStatuses.length,
      completed: tenantStatuses.filter((status) => status.status === "completed").length,
      overdue: tenantStatuses.filter((status) => status.status === "overdue").length,
      inProgress: tenantStatuses.filter((status) => status.status === "in_progress").length
    };
  }

  userSummary(tenantId: string, userId: string, statuses: ComplianceStatus[]) {
    const userStatuses = statuses.filter((status) => status.tenantId === tenantId && status.userId === userId);
    return {
      tenantId,
      userId,
      statuses: userStatuses,
      overdueItems: userStatuses.filter((status) => status.status === "overdue")
    };
  }

  outstandingAcknowledgements(tenantId: string, acknowledgements: AcknowledgementRecord[]) {
    return acknowledgements.filter(
      (record) => record.tenantId === tenantId && record.status !== "completed"
    );
  }

  hrOverrideHistory(tenantId: string, overrides: HROverrideRecord[]) {
    return overrides.filter((record) => record.tenantId === tenantId);
  }
}
