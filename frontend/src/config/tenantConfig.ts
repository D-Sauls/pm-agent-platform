function viteEnv(): Record<string, string | undefined> {
  const runtimeEnv = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {});
  const processEnv =
    (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  return { ...processEnv, ...runtimeEnv };
}

export function defaultTenantId(): string {
  return viteEnv().VITE_DEFAULT_TENANT_ID?.trim() ?? "";
}

export function secondaryTenantId(): string {
  return viteEnv().VITE_SECONDARY_TENANT_ID?.trim() ?? "";
}
