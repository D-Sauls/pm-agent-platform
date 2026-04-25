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

test("ConnectorConfigService resolves tenant SharePoint OAuth config", async () => {
  const repo = new MemoryConnectorConfigRepository();
  await repo.upsert({
    tenantId: "tenant-acme",
    connectorName: "sharepoint",
    authType: "oauth",
    siteId: "site-1",
    driveId: "drive-1",
    isEnabled: true
  });
  const service = new ConnectorConfigService(
    repo,
    new StaticSecretProvider({
      SHAREPOINT_CLIENT_ID__TENANT_ACME: "client-id",
      SHAREPOINT_CLIENT_SECRET__TENANT_ACME: "client-secret"
    })
  );

  const resolved = await service.resolveConnectorAuth("tenant-acme", "sharepoint");
  assert.equal(resolved.config.siteId, "site-1");
  assert.equal(resolved.config.driveId, "drive-1");
  assert.equal(resolved.clientId, "client-id");
  assert.equal(resolved.clientSecret, "client-secret");
});

test("ConnectorConfigService throws when SharePoint OAuth secret is missing", async () => {
  const repo = new MemoryConnectorConfigRepository();
  await repo.upsert({
    tenantId: "tenant-acme",
    connectorName: "sharepoint",
    authType: "oauth",
    siteId: "site-1",
    driveId: "drive-1",
    isEnabled: true
  });
  const service = new ConnectorConfigService(repo, new StaticSecretProvider({}));

  await assert.rejects(async () => {
    await service.resolveConnectorAuth("tenant-acme", "sharepoint");
  }, /Missing OAuth credentials/);
});
