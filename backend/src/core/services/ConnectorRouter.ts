import { AppError } from "../errors/AppError.js";
import type { BaseConnector } from "../connectors/BaseConnector.js";
import type { TenantContext } from "../models/tenantModels.js";

export class ConnectorRouter {
  constructor(private readonly connectors: BaseConnector[]) {}

  resolveConnector(tenantContext: TenantContext, sourceSystem: string): BaseConnector {
    if (!tenantContext.enabledConnectors.includes(sourceSystem)) {
      throw new AppError(
        "CONNECTOR_NOT_FOUND",
        `Connector ${sourceSystem} is not enabled for tenant ${tenantContext.tenant.tenantId}`,
        404
      );
    }
    const connector = this.connectors.find((candidate) => candidate.sourceSystem === sourceSystem);
    if (!connector) {
      throw new AppError("CONNECTOR_UNAVAILABLE", `No connector registered for ${sourceSystem}`, 503);
    }
    return connector;
  }
}
