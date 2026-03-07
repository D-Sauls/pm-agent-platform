import type {
  AdminAuditLog,
  License,
  Tenant,
  UsageLog
} from "../models/tenantModels.js";
import type { Project } from "../models/projectModels.js";

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
