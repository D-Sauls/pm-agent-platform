import type { AcknowledgementRecord, PolicyVersion } from "../../models/complianceModels.js";
import { loggingService } from "../../../observability/runtime.js";

export class PolicyVersionService {
  private versions = new Map<string, PolicyVersion[]>();

  createVersion(version: PolicyVersion): PolicyVersion {
    const history = this.versions.get(version.policyId) ?? [];
    const nextHistory = history.map((entry) => ({ ...entry, isCurrent: false }));
    nextHistory.push(version);
    this.versions.set(version.policyId, nextHistory);
    loggingService.info("compliance.policy_version.published", {
      tenantId: version.tenantId,
      actorId: version.publishedBy ?? "system",
      actorRole: "admin",
      subjectType: "policy",
      subjectId: version.policyId
    });
    return version;
  }

  listVersionHistory(policyId: string): PolicyVersion[] {
    return (this.versions.get(policyId) ?? []).sort(
      (a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime()
    );
  }

  getCurrentVersion(policyId: string): PolicyVersion | null {
    return this.listVersionHistory(policyId).find((entry) => entry.isCurrent) ?? null;
  }

  invalidateAcknowledgementsForPolicy(
    policyId: string,
    acknowledgements: AcknowledgementRecord[]
  ): AcknowledgementRecord[] {
    const currentVersion = this.getCurrentVersion(policyId);
    if (!currentVersion) {
      return acknowledgements;
    }
    return acknowledgements.map((record) =>
      record.subjectType === "policy" &&
      record.subjectId === policyId &&
      record.subjectVersionId !== currentVersion.id &&
      record.status === "completed"
        ? { ...record, status: "invalidated" }
        : record
    );
  }
}
