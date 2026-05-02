import "dotenv/config";

type EnvSource = Record<string, string | undefined>;
type AppEnvironment = "local" | "dev" | "staging" | "production";
type LogLevel = "debug" | "info" | "warn" | "error";

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function inferAppEnvironment(source: EnvSource): AppEnvironment {
  const explicit = source.APP_ENV?.toLowerCase();
  if (explicit === "local" || explicit === "dev" || explicit === "staging" || explicit === "production") {
    return explicit;
  }
  if (source.NODE_ENV === "production") {
    return "production";
  }
  return "local";
}

export function loadEnvConfig(source: EnvSource = process.env) {
  const appEnv = inferAppEnvironment(source);
  const nodeEnv = source.NODE_ENV ?? (appEnv === "production" ? "production" : "development");
  const logLevel =
    (source.LOG_LEVEL as LogLevel | undefined) ?? (nodeEnv === "development" ? "debug" : "info");

  return {
    appEnv,
    nodeEnv,
    port: readNumber(source.PORT, 4000),
    databaseUrl: source.DATABASE_URL ?? (appEnv === "local" ? "file:./data/onboarding-local.db" : ""),
    keyVaultUri: source.KEYVAULT_URI ?? "",
    openAiApiKey: source.OPENAI_API_KEY ?? "",
    openAiModel: source.OPENAI_MODEL ?? "gpt-4.1-mini",
    openAiBaseUrl: source.OPENAI_BASE_URL ?? "",
    adminAuthMode: source.ADMIN_AUTH_MODE ?? "local",
    teamsAppId: source.TEAMS_APP_ID ?? "00000000-0000-0000-0000-000000000001",
    teamsBotAppId:
      source.TEAMS_BOT_APP_ID ??
      source.TEAMS_APP_ID ??
      "00000000-0000-0000-0000-000000000001",
    teamsAppDomain: source.TEAMS_APP_DOMAIN ?? "localhost:5173",
    botEndpoint: source.BOT_ENDPOINT ?? "http://localhost:4000/api/teams/messages",
    licenseSecret: source.LICENSE_SECRET ?? "local-dev-license-secret",
    graphClientId: source.GRAPH_CLIENT_ID ?? "",
    graphClientSecret: source.GRAPH_CLIENT_SECRET ?? "",
    graphRedirectUri: source.GRAPH_REDIRECT_URI ?? "http://localhost:4000/api/m365/graph/callback",
    graphDefaultTenantId: source.GRAPH_TENANT_ID ?? "common",
    logLevel,
    telemetryVerbose: source.TELEMETRY_VERBOSE === "true" || nodeEnv === "development",
    rateLimitWindowMs: readNumber(source.RATE_LIMIT_WINDOW_MS, 60_000),
    rateLimitWorkflowMax: readNumber(source.RATE_LIMIT_WORKFLOW_MAX, 60),
    rateLimitAgentMax: readNumber(source.RATE_LIMIT_AGENT_MAX, 60),
    rateLimitAdminMax: readNumber(source.RATE_LIMIT_ADMIN_MAX, 120),
    platformDataDir: source.PLATFORM_DATA_DIR ?? source.DATA_DIR ?? "data",
    defaultTenantId: source.DEFAULT_TENANT_ID ?? source.VITE_DEFAULT_TENANT_ID ?? "tenant-acme",
    defaultTenantName: source.DEFAULT_TENANT_NAME ?? "Acme Corp",
    defaultTenantRegion: source.DEFAULT_TENANT_REGION ?? "us",
    secondaryTenantId: source.SECONDARY_TENANT_ID ?? "tenant-beta",
    secondaryTenantName: source.SECONDARY_TENANT_NAME ?? "Beta Industries",
    secondaryTenantRegion: source.SECONDARY_TENANT_REGION ?? "eu",
    activationBaseUrl: source.ACTIVATION_BASE_URL ?? source.FRONTEND_BASE_URL ?? "http://localhost:5173",
    activationDeliveryMode: source.ACTIVATION_DELIVERY_MODE ?? "log",
    activationEmailProvider: source.ACTIVATION_EMAIL_PROVIDER ?? "sendgrid",
    activationDeliveryWebhookUrl: source.ACTIVATION_DELIVERY_WEBHOOK_URL ?? "",
    activationSenderEmail: source.ACTIVATION_SENDER_EMAIL ?? "no-reply@localhost",
    activationSenderSms: source.ACTIVATION_SENDER_SMS ?? "",
    sendGridApiKey: source.SENDGRID_API_KEY ?? "",
    activationDeliveryPreview:
      source.ACTIVATION_DELIVERY_PREVIEW === "true" || appEnv === "local",
    allowVolatileRuntimeState: source.ALLOW_VOLATILE_RUNTIME_STATE === "true"
  };
}

export const env = loadEnvConfig();
