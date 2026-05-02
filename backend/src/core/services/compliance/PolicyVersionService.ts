import type { AcknowledgementRecord, PolicyVersion } from "../../models/complianceModels.js";
import { loggingService } from "../../../observability/runtime.js";

export interface PolicyVersionStore {
  appendSync(version: PolicyVersion): void;
  listByPolicySync(policyId: string): PolicyVersion[];
}

export class PolicyVersionService {
  private versions = new Map<string, PolicyVersion[]>();

  constructor(private readonly store?: PolicyVersionStore) {}

  createVersion(version: PolicyVersion): PolicyVersion {
    if (this.store) {
      const history = this.store.listByPolicySync(version.policyId);
      for (const entry of history) {
        if (entry.isCurrent && entry.id !== version.id) {
          this.store.appendSync({ ...entry, isCurrent: false });
        }
      }
      this.store.appendSync(version);
      loggingService.info("compliance.policy_version.published", {
        tenantId: version.tenantId,
        actorId: version.publishedBy ?? "system",
        actorRole: "admin",
        subjectType: "policy",
        subjectId: version.policyId
      });
      return version;
    }
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
    if (this.store) {
      return this.store.listByPolicySync(policyId).sort(
        (a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime()
      );
    }
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
        ? {
            ...record,
            id: `invalidated-${record.id}-${currentVersion.id}`,
            status: "invalidated",
            recordedAt: new Date(),
            notes: `Superseded by policy version ${currentVersion.id}`
          }
        : record
    );
  }
}
