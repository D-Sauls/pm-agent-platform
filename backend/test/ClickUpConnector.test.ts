import assert from "node:assert/strict";
import test from "node:test";
import { ClickUpConnector } from "../src/core/connectors/clickup/ClickUpConnector.js";
import type { ClickUpClient } from "../src/core/connectors/clickup/ClickUpClient.js";
import { MemoryConnectorConfigRepository } from "../src/core/repositories/memory/MemoryRepositories.js";
import type { TenantContext } from "../src/core/models/tenantModels.js";
import { ConnectorConfigService } from "../src/core/services/connectors/ConnectorConfigService.js";
import type { SecretProvider } from "../src/core/services/connectors/SecretProvider.js";

class StaticSecretProvider implements SecretProvider {
  constructor(private readonly values: Record<string, string>) {}
  async getSecret(key: string): Promise<string | null> {
    return this.values[key] ?? null;
  }
}

function tenantContext(tenantId = "tenant-acme"): TenantContext {
  return {
    tenant: {
      tenantId,
      organizationName: "Acme",
      status: "active",
      licenseStatus: "active",
      planType: "enterprise",
      createdDate: new Date(),
      updatedDate: new Date(),
      defaultPromptVersion: null,
      enabledConnectors: ["clickup"],
      featureFlags: []
    },
    license: {
      tenantId,
      status: "active",
      planType: "enterprise",
      expiryDate: null,
      trialEndsAt: null,
      lastValidatedAt: null
    },
    enabledConnectors: ["clickup"],
    defaultPromptVersion: null,
    featureFlags: []
  };
}

test("ClickUpConnector healthCheck returns healthy for reachable config/client", async () => {
  const repo = new MemoryConnectorConfigRepository();
  await repo.upsert({
    tenantId: "tenant-acme",
    connectorName: "clickup",
    authType: "api_key",
    listId: "list-1",
    teamId: "team-1",
    isEnabled: true
  });
  const service = new ConnectorConfigService(
    repo,
    new StaticSecretProvider({ CLICKUP_API_KEY__TENANT_ACME: "key" })
  );
  const client: ClickUpClient = {
    getList: async () => ({ id: "list-1", name: "List 1" }),
    getTasks: async () => [],
    getTimeEntries: async () => []
  };
  const connector = new ClickUpConnector(service, client);
  const result = await connector.healthCheck(tenantContext());
  assert.equal(result.status, "healthy");
});

test("ClickUpConnector maps task data from client", async () => {
  const repo = new MemoryConnectorConfigRepository();
  await repo.upsert({
    tenantId: "tenant-acme",
    connectorName: "clickup",
    authType: "api_key",
    listId: "list-1",
    teamId: "team-1",
    isEnabled: true
  });
  const service = new ConnectorConfigService(
    repo,
    new StaticSecretProvider({ CLICKUP_API_KEY__TENANT_ACME: "key" })
  );
  const client: ClickUpClient = {
    getList: async () => ({ id: "list-1", name: "List 1" }),
    getTasks: async () => [{ id: "t1", name: "Task 1", status: { status: "In Progress" } }],
    getTimeEntries: async () => []
  };
  const connector = new ClickUpConnector(service, client);
  const tasks = await connector.getTasks(tenantContext(), "list-1");
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].sourceSystem, "clickup");
});
