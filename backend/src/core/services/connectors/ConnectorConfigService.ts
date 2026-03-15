import { AppError } from "../../errors/AppError.js";
import type { ConnectorConfig } from "../../models/connectorModels.js";
import type { ConnectorConfigRepository } from "../../repositories/interfaces.js";
import type { SecretProvider } from "./SecretProvider.js";

export interface ResolvedConnectorAuth {
  config: ConnectorConfig;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
}

export class ConnectorConfigService {
  constructor(
    private readonly repository: ConnectorConfigRepository,
    private readonly secretProvider: SecretProvider
  ) {}

  async getConnectorConfig(tenantId: string, connectorName: string): Promise<ConnectorConfig> {
    const config = await this.repository.getByTenantAndName(tenantId, connectorName);
    if (!config || !config.isEnabled) {
      throw new AppError(
        "CONNECTOR_CONFIG_NOT_FOUND",
        `Connector config not found for ${connectorName} / ${tenantId}`,
        404
      );
    }
    return config;
  }

  async resolveConnectorAuth(tenantId: string, connectorName: string): Promise<ResolvedConnectorAuth> {
    const config = await this.getConnectorConfig(tenantId, connectorName);
    if (config.authType === "oauth") {
      const clientId =
        (await this.secretProvider.getSecret(this.toTenantSecretKey(tenantId, `${connectorName}_client_id`))) ??
        (await this.secretProvider.getSecret(`${connectorName.toUpperCase()}_CLIENT_ID`));
      const clientSecret =
        (await this.secretProvider.getSecret(this.toTenantSecretKey(tenantId, `${connectorName}_client_secret`))) ??
        (await this.secretProvider.getSecret(`${connectorName.toUpperCase()}_CLIENT_SECRET`));

      if (!clientId || !clientSecret) {
        throw new AppError(
          "CONNECTOR_AUTH_FAILED",
          `Missing OAuth credentials for ${connectorName}.`,
          401
        );
      }

      return { config, clientId, clientSecret };
    }

    const tenantSecretKey = this.toTenantSecretKey(tenantId, connectorName);
    const globalSecretKey = `${connectorName.toUpperCase()}_API_KEY`;
    const apiKey =
      (await this.secretProvider.getSecret(tenantSecretKey)) ??
      (await this.secretProvider.getSecret(globalSecretKey));

    if (!apiKey) {
      throw new AppError(
        "CONNECTOR_AUTH_FAILED",
        `Missing API key for ${connectorName}. Expected ${tenantSecretKey} or ${globalSecretKey}`,
        401
      );
    }

    return { config, apiKey };
  }

  private toTenantSecretKey(tenantId: string, secretName: string): string {
    const normalized = tenantId.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    return `${secretName.toUpperCase()}__${normalized}`;
  }
}
