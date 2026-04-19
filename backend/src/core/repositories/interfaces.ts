import type {
  AdminAuditLog,
  License,
  Tenant,
  UsageLog
} from "../models/tenantModels.js";
import type { Project } from "../models/projectModels.js";
import type {
  AcknowledgementRecord,
  ComplianceConfig,
  ComplianceRequirement,
  CourseVersion,
  HROverrideRecord,
  PolicyVersion
} from "../models/complianceModels.js";
import type { Resource, TimeEntry } from "../models/timeModels.js";
import type { ConnectorConfig } from "../models/connectorModels.js";
import type { OnboardingPath, RoleProfile } from "../models/onboardingModels.js";

export interface TenantRepository {
  create(tenant: Tenant): Promise<Tenant>;
  update(tenant: Tenant): Promise<Tenant>;
  getById(tenantId: string): Promise<Tenant | null>;
  list(): Promise<Tenant[]>;
}

export interface LicenseRepository {
  upsert(license: License): Promise<License>;
  getByTenantId(tenantId: string): Promise<License | null>;
  list(): Promise<License[]>;
}

export interface UsageLogRepository {
  append(log: UsageLog): Promise<void>;
  listByTenant(tenantId: string): Promise<UsageLog[]>;
  listRecent(limit: number): Promise<UsageLog[]>;
}

export interface AdminAuditLogRepository {
  append(log: AdminAuditLog): Promise<void>;
  listRecent(limit: number): Promise<AdminAuditLog[]>;
}

export interface ProjectRepository {
  upsert(project: Project): Promise<Project>;
  getById(projectId: string): Promise<Project | null>;
  listByTenant(tenantId: string): Promise<Project[]>;
}

export interface PromptMappingRepository {
  setDefaultPromptVersion(tenantId: string, version: string | null): Promise<void>;
  getDefaultPromptVersion(tenantId: string): Promise<string | null>;
}

export interface TimeEntryQuery {
  tenantId: string;
  projectId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface TimeEntryRepository {
  upsertMany(entries: TimeEntry[]): Promise<void>;
  list(query: TimeEntryQuery): Promise<TimeEntry[]>;
}

export interface ResourceRepository {
  upsertMany(resources: Resource[]): Promise<void>;
  listByTenant(tenantId: string): Promise<Resource[]>;
}

export interface ConnectorConfigRepository {
  upsert(config: ConnectorConfig): Promise<ConnectorConfig>;
  getByTenantAndName(tenantId: string, connectorName: string): Promise<ConnectorConfig | null>;
  listByTenant(tenantId: string): Promise<ConnectorConfig[]>;
}

export interface PolicyVersionRepository {
  append(version: PolicyVersion): Promise<void>;
  listByPolicy(policyId: string): Promise<PolicyVersion[]>;
}

export interface CourseVersionRepository {
  append(version: CourseVersion): Promise<void>;
  listByCourse(courseId: string): Promise<CourseVersion[]>;
}

export interface AcknowledgementRepository {
  append(record: AcknowledgementRecord): Promise<void>;
  replaceForTenant(tenantId: string, records: AcknowledgementRecord[]): Promise<void>;
  listByTenant(tenantId: string): Promise<AcknowledgementRecord[]>;
}

export interface ComplianceRequirementRepository {
  append(requirement: ComplianceRequirement): Promise<void>;
  listByTenant(tenantId: string): Promise<ComplianceRequirement[]>;
}

export interface ComplianceConfigRepository {
  upsert(tenantId: string, config: ComplianceConfig): Promise<ComplianceConfig>;
  getByTenant(tenantId: string): Promise<ComplianceConfig | null>;
}

export interface HROverrideRepository {
  append(record: HROverrideRecord): Promise<void>;
  listByTenant(tenantId: string): Promise<HROverrideRecord[]>;
}

export interface RoleProfileRepository {
  create(roleProfile: RoleProfile): Promise<RoleProfile>;
  getById(tenantId: string, roleId: string): Promise<RoleProfile | null>;
  listByTenant(tenantId: string): Promise<RoleProfile[]>;
}

export interface OnboardingPathRepository {
  create(path: OnboardingPath): Promise<OnboardingPath>;
  getById(tenantId: string, pathId: string): Promise<OnboardingPath | null>;
  listByTenant(tenantId: string): Promise<OnboardingPath[]>;
}
