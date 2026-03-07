import type { ConnectorProvider } from "../../../connectors/baseConnector.js";

export type LicenseStatus = "active" | "inactive" | "suspended";
export type PlanType = "starter" | "professional" | "enterprise";

export interface Tenant {
  tenantId: string;
  organizationName: string;
  licenseStatus: LicenseStatus;
  planType: PlanType;
  createdDate: string;
  connectorConfig: {
    primaryConnector?: ConnectorProvider;
    enabledConnectors: ConnectorProvider[];
  };
}
