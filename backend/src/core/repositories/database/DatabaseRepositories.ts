import type {
  AdminAuditLog,
  License,
  Tenant,
  UsageLog
} from "../../models/tenantModels.js";
import type { ConnectorConfig } from "../../models/connectorModels.js";
import type {
  AcknowledgementRecord,
  ComplianceConfig,
  ComplianceRequirement,
  ComplianceStatus,
  CourseVersion,
  HROverrideRecord,
  PolicyVersion
} from "../../models/complianceModels.js";
import type {
  ActivationRecord,
  ActivationDeliveryAttempt,
  HrImportState,
  ImportJobStatus,
  ProvisionedUser,
  RoleAssignmentOutcome,
  UserImportJob,
  UserImportRow
} from "../../models/hrImportModels.js";
import type { Course, LearningProgress, Policy } from "../../models/knowledgeModels.js";
import type { OnboardingPath, RoleProfile } from "../../models/onboardingModels.js";
import type { HrImportRepository } from "../../services/hr/FileHrImportRepository.js";
import type {
  AcknowledgementRepository,
  AdminAuditLogRepository,
  ComplianceConfigRepository,
  ComplianceRequirementRepository,
  ConnectorConfigRepository,
  CourseVersionRepository,
  HROverrideRepository,
  LicenseRepository,
  OnboardingPathRepository,
  PolicyVersionRepository,
  PromptMappingRepository,
  RoleProfileRepository,
  TenantRepository,
  UsageLogRepository
} from "../interfaces.js";
import { JsonDocumentStore, type DocumentStore } from "../../database/JsonDocumentStore.js";
import { SqliteAppDatabase } from "../../database/SqliteAppDatabase.js";

const globalTenant = "__global__";

export class DatabaseTenantRepository implements TenantRepository {
  constructor(private readonly store: DocumentStore) {}

  async create(tenant: Tenant): Promise<Tenant> {
    const stored = this.store.upsert("tenant", tenant.tenantId, tenant.tenantId, tenant);
    this.indexTenant(tenant);
    return stored;
  }

  async update(tenant: Tenant): Promise<Tenant> {
    const stored = this.store.upsert("tenant", tenant.tenantId, tenant.tenantId, tenant);
    this.indexTenant(tenant);
    return stored;
  }

  async getById(tenantId: string): Promise<Tenant | null> {
    return this.store.get<Tenant>("tenant", tenantId, tenantId);
  }

  async list(): Promise<Tenant[]> {
    return this.store.list<Tenant>("tenant-index", globalTenant).flatMap((entry) => {
      const tenant = this.store.get<Tenant>("tenant", entry.tenantId, entry.tenantId);
      return tenant ? [tenant] : [];
    });
  }

  indexTenant(tenant: Tenant): void {
    this.store.upsert("tenant-index", globalTenant, tenant.tenantId, tenant);
  }
}

export class DatabaseLicenseRepository implements LicenseRepository {
  constructor(private readonly store: DocumentStore) {}

  async upsert(license: License): Promise<License> {
    const stored = this.store.upsert("license", license.tenantId, license.tenantId, license);
    this.store.upsert("license-index", globalTenant, license.tenantId, {
      id: license.tenantId,
      tenantId: license.tenantId
    });
    return stored;
  }

  async getByTenantId(tenantId: string): Promise<License | null> {
    return this.store.get<License>("license", tenantId, tenantId);
  }

  async list(): Promise<License[]> {
    return this.store
      .list<{ id: string; tenantId: string }>("license-index", globalTenant)
      .flatMap((entry) => {
        const license = this.store.get<License>("license", entry.tenantId, entry.tenantId);
        return license ? [license] : [];
      });
  }
}

export class DatabasePromptMappingRepository implements PromptMappingRepository {
  constructor(private readonly store: DocumentStore) {}

  async setDefaultPromptVersion(tenantId: string, version: string | null): Promise<void> {
    this.store.upsert("prompt-mapping", tenantId, tenantId, { id: tenantId, tenantId, version });
  }

  async getDefaultPromptVersion(tenantId: string): Promise<string | null> {
    return this.store.get<{ version: string | null }>("prompt-mapping", tenantId, tenantId)?.version ?? null;
  }
}

export class DatabaseConnectorConfigRepository implements ConnectorConfigRepository {
  constructor(private readonly store: DocumentStore) {}

  async upsert(config: ConnectorConfig): Promise<ConnectorConfig> {
    return this.store.upsert("connector-config", config.tenantId, config.connectorName, {
      id: config.connectorName,
      ...config
    });
  }

  async getByTenantAndName(tenantId: string, connectorName: string): Promise<ConnectorConfig | null> {
    return this.store.get<ConnectorConfig>("connector-config", tenantId, connectorName);
  }

  async listByTenant(tenantId: string): Promise<ConnectorConfig[]> {
    return this.store.list<ConnectorConfig>("connector-config", tenantId);
  }
}

export class DatabaseUsageLogRepository implements UsageLogRepository {
  constructor(private readonly store: DocumentStore) {}

  async append(log: UsageLog): Promise<void> {
    this.store.append("usage-log", log.tenantId, log.id, log);
    this.store.upsert("usage-log-index", globalTenant, log.id, {
      id: log.id,
      tenantId: log.tenantId
    });
  }

  async listByTenant(tenantId: string): Promise<UsageLog[]> {
    return this.store.listEvents<UsageLog>("usage-log", tenantId);
  }

  async listRecent(limit: number): Promise<UsageLog[]> {
    return this.store
      .list<{ id: string; tenantId: string }>("usage-log-index", globalTenant)
      .slice(-limit)
      .flatMap((entry) => {
        const events = this.store.listEvents<UsageLog>("usage-log", entry.tenantId);
        return events.filter((event) => event.id === entry.id);
      });
  }
}

export class DatabaseAdminAuditLogRepository implements AdminAuditLogRepository {
  constructor(private readonly store: DocumentStore) {}

  async append(log: AdminAuditLog): Promise<void> {
    this.store.append("admin-audit-log", log.tenantId ?? globalTenant, log.id, log);
    this.store.upsert("admin-audit-log-index", globalTenant, log.id, {
      id: log.id,
      tenantId: log.tenantId ?? globalTenant
    });
  }

  async listRecent(limit: number): Promise<AdminAuditLog[]> {
    return this.store
      .list<{ id: string; tenantId: string }>("admin-audit-log-index", globalTenant)
      .slice(-limit)
      .flatMap((entry) => {
        const events = this.store.listEvents<AdminAuditLog>("admin-audit-log", entry.tenantId);
        return events.filter((event) => event.id === entry.id);
      });
  }
}

export class DatabaseRoleProfileRepository implements RoleProfileRepository {
  constructor(private readonly store: DocumentStore) {}

  async create(roleProfile: RoleProfile): Promise<RoleProfile> {
    return this.store.upsert("role-profile", roleProfile.tenantId, roleProfile.id, roleProfile);
  }

  async getById(tenantId: string, roleId: string): Promise<RoleProfile | null> {
    return this.store.get<RoleProfile>("role-profile", tenantId, roleId);
  }

  async listByTenant(tenantId: string): Promise<RoleProfile[]> {
    return this.store.list<RoleProfile>("role-profile", tenantId);
  }
}

export class DatabaseOnboardingPathRepository implements OnboardingPathRepository {
  constructor(private readonly store: DocumentStore) {}

  async create(path: OnboardingPath): Promise<OnboardingPath> {
    return this.store.upsert("onboarding-path", path.tenantId, path.id, path);
  }

  async getById(tenantId: string, pathId: string): Promise<OnboardingPath | null> {
    return this.store.get<OnboardingPath>("onboarding-path", tenantId, pathId);
  }

  async listByTenant(tenantId: string): Promise<OnboardingPath[]> {
    return this.store.list<OnboardingPath>("onboarding-path", tenantId);
  }
}

export class DatabaseCourseCatalogRepository {
  constructor(private readonly store: DocumentStore) {}

  upsert(course: Course): Course {
    return this.store.upsert("course", course.tenantId, course.id, course);
  }

  getById(tenantId: string, courseId: string): Course | null {
    return this.store.get<Course>("course", tenantId, courseId);
  }

  listByTenant(tenantId: string): Course[] {
    return this.store.list<Course>("course", tenantId);
  }
}

export class DatabasePolicyCatalogRepository {
  constructor(private readonly store: DocumentStore) {}

  upsert(policy: Policy): Policy {
    return this.store.upsert("policy", policy.tenantId, policy.id, policy);
  }

  getById(tenantId: string, policyId: string): Policy | null {
    return this.store.get<Policy>("policy", tenantId, policyId);
  }

  listByTenant(tenantId: string): Policy[] {
    return this.store.list<Policy>("policy", tenantId);
  }
}

export class DatabaseLearningProgressRepository {
  constructor(private readonly store: DocumentStore) {}

  upsert(progress: LearningProgress): LearningProgress {
    return this.store.upsert(
      "learning-progress",
      progress.tenantId,
      `${progress.userId}:${progress.courseId}:${progress.lessonId}`,
      { id: `${progress.userId}:${progress.courseId}:${progress.lessonId}`, ...progress }
    ) as LearningProgress;
  }

  listByUser(tenantId: string, userId: string, courseId?: string): LearningProgress[] {
    return this.store
      .list<LearningProgress>("learning-progress", tenantId)
      .filter((entry) => entry.userId === userId && (!courseId || entry.courseId === courseId));
  }
}

export class DatabasePolicyVersionRepository implements PolicyVersionRepository {
  constructor(private readonly store: DocumentStore) {}

  async append(version: PolicyVersion): Promise<void> {
    this.appendSync(version);
  }

  async listByPolicy(policyId: string): Promise<PolicyVersion[]> {
    return this.listByPolicySync(policyId);
  }

  appendSync(version: PolicyVersion): void {
    this.store.upsert("policy-version", version.tenantId, version.id, version);
    this.store.upsert("policy-version-index", globalTenant, version.id, {
      id: version.id,
      tenantId: version.tenantId,
      policyId: version.policyId
    });
  }

  listByPolicySync(policyId: string): PolicyVersion[] {
    return this.store
      .list<{ id: string; tenantId: string; policyId: string }>("policy-version-index", globalTenant)
      .filter((entry) => entry.policyId === policyId)
      .flatMap((entry) => {
        const version = this.store.get<PolicyVersion>("policy-version", entry.tenantId, entry.id);
        return version ? [version] : [];
      });
  }

  listByTenant(tenantId: string): PolicyVersion[] {
    return this.store.list<PolicyVersion>("policy-version", tenantId);
  }
}

export class DatabaseCourseVersionRepository implements CourseVersionRepository {
  constructor(private readonly store: DocumentStore) {}

  async append(version: CourseVersion): Promise<void> {
    this.appendSync(version);
  }

  async listByCourse(courseId: string): Promise<CourseVersion[]> {
    return this.listByCourseSync(courseId);
  }

  appendSync(version: CourseVersion): void {
    this.store.upsert("course-version", version.tenantId, version.id, version);
    this.store.upsert("course-version-index", globalTenant, version.id, {
      id: version.id,
      tenantId: version.tenantId,
      courseId: version.courseId
    });
  }

  listByCourseSync(courseId: string): CourseVersion[] {
    return this.store
      .list<{ id: string; tenantId: string; courseId: string }>("course-version-index", globalTenant)
      .filter((entry) => entry.courseId === courseId)
      .flatMap((entry) => {
        const version = this.store.get<CourseVersion>("course-version", entry.tenantId, entry.id);
        return version ? [version] : [];
      });
  }

  listByTenant(tenantId: string): CourseVersion[] {
    return this.store.list<CourseVersion>("course-version", tenantId);
  }
}

export class DatabaseAcknowledgementRepository implements AcknowledgementRepository {
  constructor(private readonly store: DocumentStore) {}

  async append(record: AcknowledgementRecord): Promise<void> {
    this.appendSync(record);
  }

  async replaceForTenant(tenantId: string, records: AcknowledgementRecord[]): Promise<void> {
    for (const record of records.filter((entry) => entry.tenantId === tenantId)) {
      this.appendIfMissing(record);
    }
  }

  async listByTenant(tenantId: string): Promise<AcknowledgementRecord[]> {
    return this.listByTenantSync(tenantId);
  }

  appendSync(record: AcknowledgementRecord): void {
    this.appendIfMissing(record);
  }

  appendIfMissing(record: AcknowledgementRecord): void {
    try {
      this.store.append("acknowledgement", record.tenantId, record.id, record);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("UNIQUE")) {
        throw error;
      }
    }
  }

  listByTenantSync(tenantId: string): AcknowledgementRecord[] {
    return this.store.listEvents<AcknowledgementRecord>("acknowledgement", tenantId);
  }
}

export class DatabaseComplianceRequirementRepository implements ComplianceRequirementRepository {
  constructor(private readonly store: DocumentStore) {}

  async append(requirement: ComplianceRequirement): Promise<void> {
    this.appendSync(requirement);
  }

  async listByTenant(tenantId: string): Promise<ComplianceRequirement[]> {
    return this.listByTenantSync(tenantId);
  }

  appendSync(requirement: ComplianceRequirement): void {
    this.store.upsert("compliance-requirement", requirement.tenantId, requirement.id, requirement);
  }

  listByTenantSync(tenantId: string): ComplianceRequirement[] {
    return this.store.list<ComplianceRequirement>("compliance-requirement", tenantId);
  }
}

export class DatabaseComplianceConfigRepository implements ComplianceConfigRepository {
  constructor(private readonly store: DocumentStore) {}

  async upsert(tenantId: string, config: ComplianceConfig): Promise<ComplianceConfig> {
    return this.upsertSync(tenantId, config);
  }

  async getByTenant(tenantId: string): Promise<ComplianceConfig | null> {
    return this.getByTenantSync(tenantId);
  }

  upsertSync(tenantId: string, config: ComplianceConfig): ComplianceConfig {
    return this.store.upsert("compliance-config", tenantId, tenantId, { id: tenantId, tenantId, ...config });
  }

  getByTenantSync(tenantId: string): ComplianceConfig | null {
    return this.store.get<ComplianceConfig>("compliance-config", tenantId, tenantId);
  }
}

export class DatabaseHROverrideRepository implements HROverrideRepository {
  constructor(private readonly store: DocumentStore) {}

  async append(record: HROverrideRecord): Promise<void> {
    this.appendSync(record);
  }

  async listByTenant(tenantId: string): Promise<HROverrideRecord[]> {
    return this.listByTenantSync(tenantId);
  }

  appendSync(record: HROverrideRecord): void {
    this.store.append("hr-override", record.tenantId, record.id, record);
  }

  listByTenantSync(tenantId: string): HROverrideRecord[] {
    return this.store.listEvents<HROverrideRecord>("hr-override", tenantId);
  }
}

export class DatabaseHrImportRepository implements HrImportRepository {
  constructor(private readonly store: DocumentStore) {}

  createJob(job: UserImportJob): UserImportJob {
    const stored = this.store.upsert("hr-import-job", job.tenantId, job.id, job);
    this.store.upsert("hr-import-job-index", globalTenant, job.id, {
      id: job.id,
      tenantId: job.tenantId
    });
    return stored;
  }

  updateJob(job: UserImportJob): UserImportJob {
    const stored = this.store.upsert("hr-import-job", job.tenantId, job.id, job);
    this.store.upsert("hr-import-job-index", globalTenant, job.id, {
      id: job.id,
      tenantId: job.tenantId
    });
    return stored;
  }

  updateJobStatus(jobId: string, status: ImportJobStatus, completedAt?: Date | null): UserImportJob {
    const job = this.getJob(jobId);
    if (!job) {
      throw new Error(`Import job ${jobId} not found`);
    }
    return this.updateJob({ ...job, status, completedAt: completedAt ?? job.completedAt });
  }

  getJob(jobId: string): UserImportJob | null {
    const index = this.store.get<{ id: string; tenantId: string }>("hr-import-job-index", globalTenant, jobId);
    return index ? this.store.get<UserImportJob>("hr-import-job", index.tenantId, jobId) : null;
  }

  listJobs(tenantId?: string): UserImportJob[] {
    if (tenantId) {
      return this.store.list<UserImportJob>("hr-import-job", tenantId);
    }
    return this.store
      .list<{ id: string; tenantId: string }>("hr-import-job-index", globalTenant)
      .flatMap((entry) => {
        const job = this.store.get<UserImportJob>("hr-import-job", entry.tenantId, entry.id);
        return job ? [job] : [];
      });
  }

  replaceRows(jobId: string, rows: UserImportRow[]): void {
    const job = this.getJob(jobId);
    if (!job) {
      throw new Error(`Import job ${jobId} not found`);
    }
    this.store.replaceScope("hr-import-row", `${job.tenantId}:${jobId}`, rows);
  }

  updateRows(rows: UserImportRow[]): void {
    for (const row of rows) {
      const job = this.getJob(row.importJobId);
      if (job) {
        this.store.upsert("hr-import-row", `${job.tenantId}:${row.importJobId}`, row.id, row);
      }
    }
  }

  listRows(jobId: string): UserImportRow[] {
    const job = this.getJob(jobId);
    return job ? this.store.list<UserImportRow>("hr-import-row", `${job.tenantId}:${jobId}`) : [];
  }

  findUserByEmployeeCode(tenantId: string, employeeCode: string): ProvisionedUser | null {
    return this.listUsers(tenantId).find((user) => user.employeeCode.toLowerCase() === employeeCode.toLowerCase()) ?? null;
  }

  findUserByEmail(tenantId: string, workEmail: string): ProvisionedUser | null {
    return this.listUsers(tenantId).find((user) => user.workEmail?.toLowerCase() === workEmail.toLowerCase()) ?? null;
  }

  findUserByUsername(tenantId: string, username: string): ProvisionedUser | null {
    const normalized = username.toLowerCase();
    return (
      this.listUsers(tenantId).find(
        (user) =>
          user.username.toLowerCase() === normalized ||
          user.employeeCode.toLowerCase() === normalized ||
          user.workEmail?.toLowerCase() === normalized
      ) ?? null
    );
  }

  createUser(user: ProvisionedUser): ProvisionedUser {
    const stored = this.store.upsert("provisioned-user", user.tenantId, user.id, user);
    this.store.upsert("provisioned-user-index", globalTenant, user.id, {
      id: user.id,
      tenantId: user.tenantId
    });
    return stored;
  }

  updateUser(user: ProvisionedUser): ProvisionedUser {
    const stored = this.store.upsert("provisioned-user", user.tenantId, user.id, user);
    this.store.upsert("provisioned-user-index", globalTenant, user.id, {
      id: user.id,
      tenantId: user.tenantId
    });
    return stored;
  }

  listUsers(tenantId: string): ProvisionedUser[] {
    return this.store.list<ProvisionedUser>("provisioned-user", tenantId);
  }

  createActivationRecord(record: ActivationRecord): ActivationRecord {
    const stored = this.store.upsert("activation-record", record.tenantId, record.id, record);
    this.store.upsert("activation-record-index", globalTenant, record.id, {
      id: record.id,
      tenantId: record.tenantId,
      activationTokenHash: record.activationTokenHash ?? null
    });
    return stored;
  }

  updateActivationRecord(record: ActivationRecord): ActivationRecord {
    const stored = this.store.upsert("activation-record", record.tenantId, record.id, record);
    this.store.upsert("activation-record-index", globalTenant, record.id, {
      id: record.id,
      tenantId: record.tenantId,
      activationTokenHash: record.activationTokenHash ?? null
    });
    return stored;
  }

  findActivationRecordByTokenHash(tokenHash: string): ActivationRecord | null {
    return this.store
      .list<{ id: string; tenantId: string; activationTokenHash: string | null }>("activation-record-index", globalTenant)
      .filter((entry) => entry.activationTokenHash === tokenHash)
      .flatMap((entry) => {
        const record = this.store.get<ActivationRecord>("activation-record", entry.tenantId, entry.id);
        return record ? [record] : [];
      })[0] ?? null;
  }

  listActivationRecords(tenantId: string): ActivationRecord[] {
    return this.store.list<ActivationRecord>("activation-record", tenantId);
  }

  recordActivationDeliveryAttempt(attempt: ActivationDeliveryAttempt): ActivationDeliveryAttempt {
    this.store.append("activation-delivery-attempt", attempt.tenantId, attempt.id, attempt);
    return attempt;
  }

  listActivationDeliveryAttempts(tenantId: string, userId?: string): ActivationDeliveryAttempt[] {
    return this.store
      .listEvents<ActivationDeliveryAttempt>("activation-delivery-attempt", tenantId)
      .filter((attempt) => !userId || attempt.userId === userId);
  }

  recordAssignment(outcome: RoleAssignmentOutcome): void {
    const user = this.findUserById(outcome.userId);
    if (!user) {
      throw new Error(`User ${outcome.userId} not found for assignment`);
    }
    this.store.upsert("onboarding-assignment", user.tenantId, outcome.userId, { id: outcome.userId, ...outcome });
  }

  listAssignments(tenantId: string, userId?: string): RoleAssignmentOutcome[] {
    return this.store
      .list<RoleAssignmentOutcome>("onboarding-assignment", tenantId)
      .filter((assignment) => !userId || assignment.userId === userId);
  }

  upsertComplianceStatuses(statuses: ComplianceStatus[]): void {
    for (const status of statuses) {
      this.store.upsert(
        "compliance-status",
        status.tenantId,
        `${status.userId}:${status.requirementId}`,
        { id: `${status.userId}:${status.requirementId}`, ...status }
      );
    }
  }

  listComplianceStatuses(tenantId: string, userId?: string): ComplianceStatus[] {
    return this.store
      .list<ComplianceStatus>("compliance-status", tenantId)
      .filter((status) => !userId || status.userId === userId);
  }

  appendAudit(event: HrImportState["auditEvents"][number]): void {
    this.store.append("hr-import-audit", event.tenantId, event.id, event);
  }

  listAuditEvents(tenantId: string): HrImportState["auditEvents"] {
    return this.store.listEvents<HrImportState["auditEvents"][number]>("hr-import-audit", tenantId);
  }

  private findUserById(userId: string): ProvisionedUser | null {
    const index = this.store.get<{ id: string; tenantId: string }>("provisioned-user-index", globalTenant, userId);
    return index ? this.store.get<ProvisionedUser>("provisioned-user", index.tenantId, userId) : null;
  }
}

export function createDatabaseRepositories(database: SqliteAppDatabase) {
  return createDatabaseRepositoriesFromStore(new JsonDocumentStore(database));
}

export function createDatabaseRepositoriesFromStore(store: DocumentStore) {
  const tenantRepository = new DatabaseTenantRepository(store);
  return {
    tenantRepository,
    licenseRepository: new DatabaseLicenseRepository(store),
    usageLogRepository: new DatabaseUsageLogRepository(store),
    adminAuditLogRepository: new DatabaseAdminAuditLogRepository(store),
    promptMappingRepository: new DatabasePromptMappingRepository(store),
    connectorConfigRepository: new DatabaseConnectorConfigRepository(store),
    roleProfileRepository: new DatabaseRoleProfileRepository(store),
    onboardingPathRepository: new DatabaseOnboardingPathRepository(store),
    courseCatalogRepository: new DatabaseCourseCatalogRepository(store),
    policyCatalogRepository: new DatabasePolicyCatalogRepository(store),
    learningProgressRepository: new DatabaseLearningProgressRepository(store),
    policyVersionRepository: new DatabasePolicyVersionRepository(store),
    courseVersionRepository: new DatabaseCourseVersionRepository(store),
    acknowledgementRepository: new DatabaseAcknowledgementRepository(store),
    complianceRequirementRepository: new DatabaseComplianceRequirementRepository(store),
    complianceConfigRepository: new DatabaseComplianceConfigRepository(store),
    hrOverrideRepository: new DatabaseHROverrideRepository(store),
    hrImportRepository: new DatabaseHrImportRepository(store)
  };
}
