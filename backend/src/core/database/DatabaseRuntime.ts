import type { env } from "../../config/env.js";

export type DatabaseDriver = "sqlite" | "postgres";

export interface DatabaseRuntimeInfo {
  driver: DatabaseDriver;
  databaseUrlConfigured: boolean;
  databasePath?: string;
  managed: boolean;
  adapterReady: boolean;
  productionReady: boolean;
  warnings: string[];
}

export type DatabaseRuntimeEnv = Pick<
  typeof env,
  "appEnv" | "databaseUrl" | "persistenceDriver"
>;

export function detectDatabaseDriver(databaseUrl: string, explicitDriver?: string): DatabaseDriver {
  const normalizedDriver = explicitDriver?.toLowerCase();
  if (normalizedDriver === "sqlite" || normalizedDriver === "postgres") {
    return normalizedDriver;
  }

  const normalizedUrl = databaseUrl.toLowerCase();
  if (normalizedUrl.startsWith("postgres://") || normalizedUrl.startsWith("postgresql://")) {
    return "postgres";
  }
  return "sqlite";
}

export function isManagedDatabaseUrl(databaseUrl: string): boolean {
  const normalizedUrl = databaseUrl.toLowerCase();
  return normalizedUrl.startsWith("postgres://") || normalizedUrl.startsWith("postgresql://");
}

export function createDatabaseRuntimeInfo(input: {
  env: DatabaseRuntimeEnv;
  databaseUrlConfigured: boolean;
  databasePath?: string;
  adapterReady: boolean;
  warnings?: string[];
}): DatabaseRuntimeInfo {
  const driver = detectDatabaseDriver(input.env.databaseUrl, input.env.persistenceDriver);
  const managed = isManagedDatabaseUrl(input.env.databaseUrl);
  const warnings = [...(input.warnings ?? [])];

  if (input.env.appEnv === "production" && !input.databaseUrlConfigured) {
    warnings.push("DATABASE_URL is required in production. The runtime is using a local fallback database.");
  }
  if (input.env.appEnv === "production" && driver === "sqlite") {
    warnings.push("SQLite file persistence is suitable for local pilots only; use PostgreSQL before production rollout.");
  }
  if (input.env.appEnv === "production" && driver === "postgres" && !input.adapterReady) {
    warnings.push("PostgreSQL is configured, but the active runtime is not yet using the managed database adapter.");
  }

  return {
    driver,
    databaseUrlConfigured: input.databaseUrlConfigured,
    databasePath: input.databasePath,
    managed,
    adapterReady: input.adapterReady,
    productionReady:
      input.env.appEnv !== "production"
        ? true
        : input.databaseUrlConfigured && managed && input.adapterReady,
    warnings
  };
}
