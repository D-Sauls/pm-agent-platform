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
    databaseUrl:
      source.DATABASE_URL ??
      (appEnv === "local" ? "file:./data/pm-agent-local.db" : ""),
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
    logLevel,
    telemetryVerbose: source.TELEMETRY_VERBOSE === "true" || nodeEnv === "development",
    rateLimitWindowMs: readNumber(source.RATE_LIMIT_WINDOW_MS, 60_000),
    rateLimitWorkflowMax: readNumber(source.RATE_LIMIT_WORKFLOW_MAX, 60),
    rateLimitAgentMax: readNumber(source.RATE_LIMIT_AGENT_MAX, 60),
    rateLimitAdminMax: readNumber(source.RATE_LIMIT_ADMIN_MAX, 120)
  };
}

export const env = loadEnvConfig();
