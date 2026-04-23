import assert from "node:assert/strict";
import test from "node:test";
import { loadEnvConfig } from "../src/config/env.js";

test("loadEnvConfig resolves deployment-focused environment variables", () => {
  const config = loadEnvConfig({
    APP_ENV: "staging",
    NODE_ENV: "production",
    PORT: "8080",
    DATABASE_URL: "postgres://onboarding-db",
    KEYVAULT_URI: "https://onboarding-kv.vault.azure.net",
    TEAMS_APP_ID: "teams-app-id",
    TEAMS_BOT_APP_ID: "teams-bot-app-id",
    TEAMS_APP_DOMAIN: "onboarding.example.com",
    BOT_ENDPOINT: "https://onboarding.example.com/api/teams/messages",
    LICENSE_SECRET: "license-secret",
    LOG_LEVEL: "warn"
  });

  assert.equal(config.appEnv, "staging");
  assert.equal(config.nodeEnv, "production");
  assert.equal(config.port, 8080);
  assert.equal(config.databaseUrl, "postgres://onboarding-db");
  assert.equal(config.keyVaultUri, "https://onboarding-kv.vault.azure.net");
  assert.equal(config.teamsAppId, "teams-app-id");
  assert.equal(config.teamsBotAppId, "teams-bot-app-id");
  assert.equal(config.teamsAppDomain, "onboarding.example.com");
  assert.equal(config.botEndpoint, "https://onboarding.example.com/api/teams/messages");
  assert.equal(config.licenseSecret, "license-secret");
  assert.equal(config.logLevel, "warn");
});

test("loadEnvConfig applies safe local defaults", () => {
  const config = loadEnvConfig({});

  assert.equal(config.appEnv, "local");
  assert.equal(config.databaseUrl, "file:./data/onboarding-local.db");
  assert.equal(config.keyVaultUri, "");
  assert.equal(config.teamsAppId, "00000000-0000-0000-0000-000000000001");
  assert.equal(config.licenseSecret, "local-dev-license-secret");
  assert.equal(config.logLevel, "debug");
});
