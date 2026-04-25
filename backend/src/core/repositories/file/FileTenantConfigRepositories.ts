import fs from "node:fs";
import path from "node:path";
import type { ConnectorConfig } from "../../models/connectorModels.js";
import type { License, Tenant } from "../../models/tenantModels.js";
import type {
  ConnectorConfigRepository,
  LicenseRepository,
  PromptMappingRepository,
  TenantRepository
} from "../interfaces.js";

interface TenantConfigState {
  tenants: Tenant[];
  licenses: License[];
  promptMappings: Record<string, string | null>;
  connectorConfigs: ConnectorConfig[];
}

function emptyState(): TenantConfigState {
  return {
    tenants: [],
    licenses: [],
    promptMappings: {},
    connectorConfigs: []
  };
}

function reviveState(state: Partial<TenantConfigState>): TenantConfigState {
  return {
    tenants: (state.tenants ?? []).map((tenant) => ({
      ...tenant,
      createdDate: new Date(tenant.createdDate),
      updatedDate: new Date(tenant.updatedDate)
    })),
    licenses: (state.licenses ?? []).map((license) => ({
      ...license,
      expiryDate: license.expiryDate ? new Date(license.expiryDate) : null,
      trialEndsAt: license.trialEndsAt ? new Date(license.trialEndsAt) : null,
      lastValidatedAt: license.lastValidatedAt ? new Date(license.lastValidatedAt) : null
    })),
    promptMappings: state.promptMappings ?? {},
    connectorConfigs: state.connectorConfigs ?? []
  };
}

export class FileTenantConfigStore {
  constructor(private readonly filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!fs.existsSync(filePath)) {
      this.write(emptyState());
    }
  }

  read(): TenantConfigState {
    const raw = fs.readFileSync(this.filePath, "utf8");
    if (!raw.trim()) {
      return emptyState();
    }
    try {
      return reviveState(JSON.parse(raw) as Partial<TenantConfigState>);
    } catch {
      return emptyState();
    }
  }

  write(state: TenantConfigState): void {
    const tempPath = `${this.filePath}.${process.pid}.${process.hrtime.bigint()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(tempPath, this.filePath);
  }
}

export class FileTenantRepository implements TenantRepository {
  constructor(private readonly store: FileTenantConfigStore) {}

  async create(tenant: Tenant): Promise<Tenant> {
    const state = this.store.read();
    state.tenants = [...state.tenants.filter((item) => item.tenantId !== tenant.tenantId), tenant];
    this.store.write(state);
    return tenant;
  }

  async update(tenant: Tenant): Promise<Tenant> {
    return this.create(tenant);
  }

  async getById(tenantId: string): Promise<Tenant | null> {
    return this.store.read().tenants.find((tenant) => tenant.tenantId === tenantId) ?? null;
  }

  async list(): Promise<Tenant[]> {
    return this.store.read().tenants;
  }
}

export class FileLicenseRepository implements LicenseRepository {
  constructor(private readonly store: FileTenantConfigStore) {}

  async upsert(license: License): Promise<License> {
    const state = this.store.read();
    state.licenses = [...state.licenses.filter((item) => item.tenantId !== license.tenantId), license];
    this.store.write(state);
    return license;
  }

  async getByTenantId(tenantId: string): Promise<License | null> {
    return this.store.read().licenses.find((license) => license.tenantId === tenantId) ?? null;
  }

  async list(): Promise<License[]> {
    return this.store.read().licenses;
  }
}

export class FilePromptMappingRepository implements PromptMappingRepository {
  constructor(private readonly store: FileTenantConfigStore) {}

  async setDefaultPromptVersion(tenantId: string, version: string | null): Promise<void> {
    const state = this.store.read();
    state.promptMappings[tenantId] = version;
    this.store.write(state);
  }

  async getDefaultPromptVersion(tenantId: string): Promise<string | null> {
    return this.store.read().promptMappings[tenantId] ?? null;
  }
}

export class FileConnectorConfigRepository implements ConnectorConfigRepository {
  constructor(private readonly store: FileTenantConfigStore) {}

  async upsert(config: ConnectorConfig): Promise<ConnectorConfig> {
    const state = this.store.read();
    state.connectorConfigs = [
      ...state.connectorConfigs.filter(
        (item) => !(item.tenantId === config.tenantId && item.connectorName === config.connectorName)
      ),
      config
    ];
    this.store.write(state);
    return config;
  }

  async getByTenantAndName(tenantId: string, connectorName: string): Promise<ConnectorConfig | null> {
    return (
      this.store
        .read()
        .connectorConfigs.find(
          (config) => config.tenantId === tenantId && config.connectorName === connectorName
        ) ?? null
    );
  }

  async listByTenant(tenantId: string): Promise<ConnectorConfig[]> {
    return this.store.read().connectorConfigs.filter((config) => config.tenantId === tenantId);
  }
}

export function createFileTenantConfigRepositories(filePath: string) {
  const store = new FileTenantConfigStore(filePath);
  return {
    tenantRepository: new FileTenantRepository(store),
    licenseRepository: new FileLicenseRepository(store),
    promptMappingRepository: new FilePromptMappingRepository(store),
    connectorConfigRepository: new FileConnectorConfigRepository(store)
  };
}
