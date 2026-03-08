import type {
  AdminAuditLogRepository,
  ConnectorConfigRepository,
  LicenseRepository,
  ProjectRepository,
  PromptMappingRepository,
  ResourceRepository,
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
