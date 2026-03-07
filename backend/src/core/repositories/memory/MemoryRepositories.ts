import type {
  AdminAuditLogRepository,
  LicenseRepository,
  ProjectRepository,
  PromptMappingRepository,
  TenantRepository,
  UsageLogRepository
} from "../interfaces.js";
import type {
  AdminAuditLog,
  License,
  Tenant,
  UsageLog
} from "../../models/tenantModels.js";
import type { Project } from "../../models/projectModels.js";

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
