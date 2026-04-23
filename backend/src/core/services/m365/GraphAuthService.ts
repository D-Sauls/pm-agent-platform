import { env } from "../../../config/env.js";
import { AppError } from "../../errors/AppError.js";
import type { GraphAuthSession } from "../../models/m365Models.js";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

export class GraphAuthService {
  private readonly appTokenCache = new Map<string, GraphAuthSession>();

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly config = env
  ) {}

  buildAdminConsentUrl(state: string, tenantId = "common"): string {
    if (!this.config.graphClientId || !this.config.graphRedirectUri) {
      throw new AppError("CONNECTOR_AUTH_FAILED", "Microsoft Graph client configuration is missing.", 500);
    }

    const url = new URL(`https://login.microsoftonline.com/${tenantId}/adminconsent`);
    url.searchParams.set("client_id", this.config.graphClientId);
    url.searchParams.set("redirect_uri", this.config.graphRedirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeAuthorizationCode(code: string, tenantId = "common", redirectUri = this.config.graphRedirectUri): Promise<GraphAuthSession> {
    return this.requestDelegatedToken(
      tenantId,
      new URLSearchParams({
        client_id: this.config.graphClientId,
        client_secret: this.config.graphClientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        scope: "https://graph.microsoft.com/.default offline_access"
      })
    );
  }

  async refreshDelegatedToken(refreshToken: string, tenantId = "common"): Promise<GraphAuthSession> {
    return this.requestDelegatedToken(
      tenantId,
      new URLSearchParams({
        client_id: this.config.graphClientId,
        client_secret: this.config.graphClientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: "https://graph.microsoft.com/.default offline_access"
      })
    );
  }

  async getAppAccessToken(tenantId = this.config.graphDefaultTenantId): Promise<string> {
    const cached = this.appTokenCache.get(tenantId);
    if (cached && cached.expiresAt.getTime() > Date.now() + 60_000) {
      return cached.accessToken;
    }

    if (!this.config.graphClientId || !this.config.graphClientSecret) {
      throw new AppError("CONNECTOR_AUTH_FAILED", "Microsoft Graph client credentials are missing.", 500);
    }

    const body = new URLSearchParams({
      client_id: this.config.graphClientId,
      client_secret: this.config.graphClientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials"
    });

    const response = await this.fetcher(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    if (!response.ok) {
      throw new AppError("CONNECTOR_AUTH_FAILED", `Graph token request failed with ${response.status}`, 401);
    }

    const token = (await response.json()) as TokenResponse;
    const session: GraphAuthSession = {
      tenantId,
      accessToken: token.access_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      scope: token.scope ?? null,
      tokenType: token.token_type ?? "Bearer",
      refreshToken: null
    };
    this.appTokenCache.set(tenantId, session);
    return session.accessToken;
  }

  private async requestDelegatedToken(tenantId: string, body: URLSearchParams): Promise<GraphAuthSession> {
    if (!env.graphClientId || !env.graphClientSecret) {
      throw new AppError("CONNECTOR_AUTH_FAILED", "Microsoft Graph client credentials are missing.", 500);
    }

    const response = await this.fetcher(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    if (!response.ok) {
      throw new AppError("CONNECTOR_AUTH_FAILED", `Graph delegated token request failed with ${response.status}`, 401);
    }

    const token = (await response.json()) as TokenResponse;
    return {
      tenantId,
      accessToken: token.access_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      refreshToken: token.refresh_token ?? null,
      scope: token.scope ?? null,
      tokenType: token.token_type ?? "Bearer"
    };
  }
}
