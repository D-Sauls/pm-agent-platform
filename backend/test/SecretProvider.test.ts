import assert from "node:assert/strict";
import test from "node:test";
import {
  AzureKeyVaultSecretProvider,
  ChainedSecretProvider,
  EnvSecretProvider,
  StaticAccessTokenProvider
} from "../src/core/services/connectors/SecretProvider.js";

test("AzureKeyVaultSecretProvider resolves secrets from Key Vault", async () => {
  const provider = new AzureKeyVaultSecretProvider(
    "https://pm-agent-kv.vault.azure.net",
    new StaticAccessTokenProvider("token-123"),
    (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ value: "resolved-secret" })
      }) as Response) as typeof fetch
  );

  const secret = await provider.getSecret("LICENSE_SECRET");
  assert.equal(secret, "resolved-secret");
});

test("AzureKeyVaultSecretProvider returns null on 404", async () => {
  const provider = new AzureKeyVaultSecretProvider(
    "https://pm-agent-kv.vault.azure.net",
    new StaticAccessTokenProvider("token-123"),
    (async () =>
      ({
        ok: false,
        status: 404,
        json: async () => ({})
      }) as Response) as typeof fetch
  );

  const secret = await provider.getSecret("MISSING_SECRET");
  assert.equal(secret, null);
});

test("ChainedSecretProvider falls back when the first provider returns null", async () => {
  process.env.TEST_CHAINED_SECRET = "fallback-secret";

  const provider = new ChainedSecretProvider([
    new AzureKeyVaultSecretProvider(
      "https://pm-agent-kv.vault.azure.net",
      new StaticAccessTokenProvider(null),
      fetch
    ),
    new EnvSecretProvider()
  ]);

  const secret = await provider.getSecret("TEST_CHAINED_SECRET");
  assert.equal(secret, "fallback-secret");

  delete process.env.TEST_CHAINED_SECRET;
});
