import assert from "node:assert/strict";
import test from "node:test";
import { MemoryConnectorConfigRepository } from "../src/core/repositories/memory/MemoryRepositories.js";
import { ConnectorConfigService } from "../src/core/services/connectors/ConnectorConfigService.js";
import type { SecretProvider } from "../src/core/services/connectors/SecretProvider.js";

class StaticSecretProvider implements SecretProvider {
  constructor(private readonly values: Record<string, string>) {}
  async getSecret(key: string): Promise<string | null> {
    return this.values[key] ?? null;
  }
}

test("ConnectorConfigService resolves tenant clickup config and api key", async () => {
  const repo = new MemoryConnectorConfigRepository();
  await repo.upsert({
    tenantId: "tenant-acme",
    connectorName: "clickup",
    authType: "api_key",
    listId: "list-1",
    isEnabled: true
  });
  const service = new ConnectorConfigService(
    repo,
    new StaticSecretProvider({ CLICKUP_API_KEY__TENANT_ACME: "test-key" })
  );

  const resolved = await service.resolveConnectorAuth("tenant-acme", "clickup");
  assert.equal(resolved.config.listId, "list-1");
  assert.equal(resolved.apiKey, "test-key");
});

test("ConnectorConfigService throws when secret is missing", async () => {
  const repo = new MemoryConnectorConfigRepository();
  await repo.upsert({
    tenantId: "tenant-acme",
    connectorName: "clickup",
    authType: "api_key",
    listId: "list-1",
    isEnabled: true
  });
  const service = new ConnectorConfigService(repo, new StaticSecretProvider({}));
  await assert.rejects(async () => {
    await service.resolveConnectorAuth("tenant-acme", "clickup");
  });
});
