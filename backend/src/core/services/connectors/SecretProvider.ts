import { env } from "../../../config/env.js";

export interface SecretProvider {
  getSecret(key: string): Promise<string | null>;
}

export class EnvSecretProvider implements SecretProvider {
  async getSecret(key: string): Promise<string | null> {
    const value = process.env[key];
    if (!value) return null;
    return value;
  }
}

export interface AccessTokenProvider {
  getToken(): Promise<string | null>;
}

export class StaticAccessTokenProvider implements AccessTokenProvider {
  constructor(private readonly token: string | null) {}

  async getToken(): Promise<string | null> {
    return this.token;
  }
}

export class ManagedIdentityAccessTokenProvider implements AccessTokenProvider {
  constructor(
    private readonly resource = "https://vault.azure.net",
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async getToken(): Promise<string | null> {
    const identityEndpoint = process.env.IDENTITY_ENDPOINT ?? process.env.MSI_ENDPOINT;
    const identityHeader = process.env.IDENTITY_HEADER ?? process.env.MSI_SECRET;
    if (!identityEndpoint || !identityHeader) {
      return process.env.AZURE_KEYVAULT_BEARER_TOKEN ?? null;
    }

    const url = new URL(identityEndpoint);
    url.searchParams.set("resource", this.resource);
    url.searchParams.set("api-version", "2019-08-01");

    const response = await this.fetcher(url, {
      headers: {
        "X-IDENTITY-HEADER": identityHeader,
        Secret: identityHeader
      }
    });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { access_token?: string };
    return body.access_token ?? null;
  }
}

export class AzureKeyVaultSecretProvider implements SecretProvider {
  constructor(
    private readonly vaultUri: string,
    private readonly accessTokenProvider: AccessTokenProvider = new ManagedIdentityAccessTokenProvider(),
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async getSecret(key: string): Promise<string | null> {
    if (!this.vaultUri) {
      return null;
    }
    const token = await this.accessTokenProvider.getToken();
    if (!token) {
      return null;
    }

    const normalizedKey = key.replace(/_/g, "-").toLowerCase();
    const url = `${this.vaultUri.replace(/\/$/, "")}/secrets/${normalizedKey}?api-version=7.4`;
    const response = await this.fetcher(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Key Vault lookup failed for ${key} with status ${response.status}`);
    }
    const body = (await response.json()) as { value?: string };
    return body.value ?? null;
  }
}

export class ChainedSecretProvider implements SecretProvider {
  constructor(private readonly providers: SecretProvider[]) {}

  async getSecret(key: string): Promise<string | null> {
    for (const provider of this.providers) {
      const value = await provider.getSecret(key);
      if (value) {
        return value;
      }
    }
    return null;
  }
}

export function createDefaultSecretProvider(): SecretProvider {
  const providers: SecretProvider[] = [new EnvSecretProvider()];
  if (env.keyVaultUri) {
    providers.unshift(new AzureKeyVaultSecretProvider(env.keyVaultUri));
  }
  return new ChainedSecretProvider(providers);
}
