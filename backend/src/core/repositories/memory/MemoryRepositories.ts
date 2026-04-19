import type {
  AdminAuditLogRepository,
  AcknowledgementRepository,
  ComplianceConfigRepository,
  ComplianceRequirementRepository,
  ConnectorConfigRepository,
  CourseVersionRepository,
  HROverrideRepository,
  LicenseRepository,
  PolicyVersionRepository,
  ProjectRepository,
  PromptMappingRepository,
  ResourceRepository,
  RoleProfileRepository,
  OnboardingPathRepository,
  TenantRepository,
  TimeEntryQuery,
  TimeEntryRepository,
  UsageLogRepository
} from "../interfaces.js";
import type {
  AdminAuditLog,
  License,
  Tenant,
  UsageLog
} from "../../models/tenantModels.js";
import type { Project } from "../../models/projectModels.js";
import type { Resource, TimeEntry } from "../../models/timeModels.js";
import type { ConnectorConfig } from "../../models/connectorModels.js";
import type {
  AcknowledgementRecord,
  ComplianceConfig,
  ComplianceRequirement,
  CourseVersion,
  HROverrideRecord,
  PolicyVersion
} from "../../models/complianceModels.js";
import type { OnboardingPath, RoleProfile } from "../../models/onboardingModels.js";

export class MemoryTenantRepository implements TenantRepository {
  private data = new Map<string, Tenant>();

  async create(tenant: Tenant): Promise<Tenant> {
    this.data.set(tenant.tenantId, tenant);
    return tenant;
  }

  async update(tenant: Tenant): Promise<Tenant> {
    this.data.set(tenant.tenantId, tenant);
    return tenant;
  }

  async getById(tenantId: string): Promise<Tenant | null> {
    return this.data.get(tenantId) ?? null;
  }

  async list(): Promise<Tenant[]> {
    return Array.from(this.data.values());
  }
}

export class MemoryLicenseRepository implements LicenseRepository {
  private data = new Map<string, License>();

  async upsert(license: License): Promise<License> {
    this.data.set(license.tenantId, license);
    return license;
  }

  async getByTenantId(tenantId: string): Promise<License | null> {
    return this.data.get(tenantId) ?? null;
  }

  async list(): Promise<License[]> {
    return Array.from(this.data.values());
  }
}

export class MemoryUsageLogRepository implements UsageLogRepository {
  private logs: UsageLog[] = [];

  async append(log: UsageLog): Promise<void> {
    this.logs.push(log);
  }

  async listByTenant(tenantId: string): Promise<UsageLog[]> {
    return this.logs.filter((log) => log.tenantId === tenantId);
  }

  async listRecent(limit: number): Promise<UsageLog[]> {
    return [...this.logs]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

export class MemoryAdminAuditLogRepository implements AdminAuditLogRepository {
  private logs: AdminAuditLog[] = [];

  async append(log: AdminAuditLog): Promise<void> {
    this.logs.push(log);
  }

  async listRecent(limit: number): Promise<AdminAuditLog[]> {
    return [...this.logs]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

export class MemoryProjectRepository implements ProjectRepository {
  private data = new Map<string, Project>();

  async upsert(project: Project): Promise<Project> {
    this.data.set(project.projectId, project);
    return project;
  }

  async getById(projectId: string): Promise<Project | null> {
    return this.data.get(projectId) ?? null;
  }

  async listByTenant(tenantId: string): Promise<Project[]> {
    return Array.from(this.data.values()).filter((project) => project.tenantId === tenantId);
  }
}

export class MemoryPromptMappingRepository implements PromptMappingRepository {
  private data = new Map<string, string | null>();

  async setDefaultPromptVersion(tenantId: string, version: string | null): Promise<void> {
    this.data.set(tenantId, version);
  }

  async getDefaultPromptVersion(tenantId: string): Promise<string | null> {
    return this.data.get(tenantId) ?? null;
  }
}

export class MemoryTimeEntryRepository implements TimeEntryRepository {
  private data = new Map<string, TimeEntry>();

  async upsertMany(entries: TimeEntry[]): Promise<void> {
    for (const entry of entries) {
      this.data.set(entry.timeEntryId, entry);
    }
  }

  async list(query: TimeEntryQuery): Promise<TimeEntry[]> {
    return Array.from(this.data.values()).filter((entry) => {
      if (entry.tenantId !== query.tenantId) return false;
      if (query.projectId && entry.projectId !== query.projectId) return false;
      if (query.userId && entry.userId !== query.userId) return false;
      if (query.startDate && entry.entryDate.getTime() < query.startDate.getTime()) return false;
      if (query.endDate && entry.entryDate.getTime() > query.endDate.getTime()) return false;
      return true;
    });
  }
}

export class MemoryResourceRepository implements ResourceRepository {
  private data = new Map<string, Resource>();

  async upsertMany(resources: Resource[]): Promise<void> {
    for (const resource of resources) {
      this.data.set(`${resource.tenantId}:${resource.userId}`, resource);
    }
  }

  async listByTenant(tenantId: string): Promise<Resource[]> {
    return Array.from(this.data.values()).filter((resource) => resource.tenantId === tenantId);
  }
}

export class MemoryConnectorConfigRepository implements ConnectorConfigRepository {
  private data = new Map<string, ConnectorConfig>();

  async upsert(config: ConnectorConfig): Promise<ConnectorConfig> {
    this.data.set(`${config.tenantId}:${config.connectorName}`, config);
    return config;
  }

  async getByTenantAndName(tenantId: string, connectorName: string): Promise<ConnectorConfig | null> {
    return this.data.get(`${tenantId}:${connectorName}`) ?? null;
  }

  async listByTenant(tenantId: string): Promise<ConnectorConfig[]> {
    return Array.from(this.data.values()).filter((config) => config.tenantId === tenantId);
  }
}

export class MemoryPolicyVersionRepository implements PolicyVersionRepository {
  private data = new Map<string, PolicyVersion[]>();

  async append(version: PolicyVersion): Promise<void> {
    const existing = this.data.get(version.policyId) ?? [];
    existing.push(version);
    this.data.set(version.policyId, existing);
  }

  async listByPolicy(policyId: string): Promise<PolicyVersion[]> {
    return [...(this.data.get(policyId) ?? [])];
  }
}

export class MemoryCourseVersionRepository implements CourseVersionRepository {
  private data = new Map<string, CourseVersion[]>();

  async append(version: CourseVersion): Promise<void> {
    const existing = this.data.get(version.courseId) ?? [];
    existing.push(version);
    this.data.set(version.courseId, existing);
  }

  async listByCourse(courseId: string): Promise<CourseVersion[]> {
    return [...(this.data.get(courseId) ?? [])];
  }
}

export class MemoryAcknowledgementRepository implements AcknowledgementRepository {
  private data: AcknowledgementRecord[] = [];

  async append(record: AcknowledgementRecord): Promise<void> {
    this.data.push(record);
  }

  async replaceForTenant(tenantId: string, records: AcknowledgementRecord[]): Promise<void> {
    this.data = [...this.data.filter((record) => record.tenantId !== tenantId), ...records];
  }

  async listByTenant(tenantId: string): Promise<AcknowledgementRecord[]> {
    return this.data.filter((record) => record.tenantId === tenantId);
  }
}

export class MemoryComplianceRequirementRepository implements ComplianceRequirementRepository {
  private data: ComplianceRequirement[] = [];

  async append(requirement: ComplianceRequirement): Promise<void> {
    this.data.push(requirement);
  }

  async listByTenant(tenantId: string): Promise<ComplianceRequirement[]> {
    return this.data.filter((requirement) => requirement.tenantId === tenantId);
  }
}

export class MemoryComplianceConfigRepository implements ComplianceConfigRepository {
  private data = new Map<string, ComplianceConfig>();

  async upsert(tenantId: string, config: ComplianceConfig): Promise<ComplianceConfig> {
    this.data.set(tenantId, config);
    return config;
  }

  async getByTenant(tenantId: string): Promise<ComplianceConfig | null> {
    return this.data.get(tenantId) ?? null;
  }
}

export class MemoryHROverrideRepository implements HROverrideRepository {
  private data: HROverrideRecord[] = [];

  async append(record: HROverrideRecord): Promise<void> {
    this.data.push(record);
  }

  async listByTenant(tenantId: string): Promise<HROverrideRecord[]> {
    return this.data.filter((record) => record.tenantId === tenantId);
  }
}

export class MemoryRoleProfileRepository implements RoleProfileRepository {
  private data = new Map<string, RoleProfile>();

  async create(roleProfile: RoleProfile): Promise<RoleProfile> {
    this.data.set(roleProfile.id, roleProfile);
    return roleProfile;
  }

  async getById(tenantId: string, roleId: string): Promise<RoleProfile | null> {
    const role = this.data.get(roleId) ?? null;
    return role && role.tenantId === tenantId ? role : null;
  }

  async listByTenant(tenantId: string): Promise<RoleProfile[]> {
    return Array.from(this.data.values()).filter((role) => role.tenantId === tenantId);
  }
}

export class MemoryOnboardingPathRepository implements OnboardingPathRepository {
  private data = new Map<string, OnboardingPath>();

  async create(path: OnboardingPath): Promise<OnboardingPath> {
    this.data.set(path.id, path);
    return path;
  }

  async getById(tenantId: string, pathId: string): Promise<OnboardingPath | null> {
    const path = this.data.get(pathId) ?? null;
    return path && path.tenantId === tenantId ? path : null;
  }

  async listByTenant(tenantId: string): Promise<OnboardingPath[]> {
    return Array.from(this.data.values()).filter((path) => path.tenantId === tenantId);
  }
}
