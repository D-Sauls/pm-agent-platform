import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  openAiBaseUrl: process.env.OPENAI_BASE_URL ?? "",
  adminAuthMode: process.env.ADMIN_AUTH_MODE ?? "local",
  logLevel:
    (process.env.LOG_LEVEL as "debug" | "info" | "warn" | "error" | undefined) ??
    (process.env.NODE_ENV === "development" ? "debug" : "info"),
  telemetryVerbose:
    process.env.TELEMETRY_VERBOSE === "true" || process.env.NODE_ENV === "development",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  rateLimitWorkflowMax: Number(process.env.RATE_LIMIT_WORKFLOW_MAX ?? 60),
  rateLimitAgentMax: Number(process.env.RATE_LIMIT_AGENT_MAX ?? 60),
  rateLimitAdminMax: Number(process.env.RATE_LIMIT_ADMIN_MAX ?? 120)
};
