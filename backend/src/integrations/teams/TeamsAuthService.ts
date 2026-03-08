import type { TeamsActivity, TeamsUserContext } from "./types.js";

export class TeamsAuthService {
  private readonly tenantMap: Record<string, string>;

  constructor(tenantMapFromEnv?: string) {
    this.tenantMap = this.parseMap(tenantMapFromEnv ?? process.env.TEAMS_TENANT_MAP);
  }

  resolve(activity: TeamsActivity, fallbackTenantId = "tenant-acme"): TeamsUserContext {
    const teamsTenantId = activity.channelData?.tenant?.id ?? null;
    const teamsUserId = activity.from?.id ?? "unknown-teams-user";
    const mappedTenant = teamsTenantId ? this.tenantMap[teamsTenantId] : undefined;

    return {
      platformTenantId: mappedTenant ?? fallbackTenantId,
      teamsTenantId,
      teamsUserId,
      displayName: activity.from?.name
    };
  }

  private parseMap(raw: string | undefined): Record<string, string> {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed ?? {};
    } catch {
      return {};
    }
  }
}
