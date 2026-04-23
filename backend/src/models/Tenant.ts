export type LicenseStatus = "active" | "inactive" | "suspended";
export type PlanType = "starter" | "professional" | "enterprise";
export type ConnectorProvider =
  | "microsoft-graph"
  | "sharepoint"
  | "teams"
  | "microsoft-project"
  | "microsoft-planner"
  | "planner"
  | "clickup"
  | "monday"
  | "zoho";

export interface Tenant {
  tenantId: string;
  organizationName: string;
  licenseStatus: LicenseStatus;
  planType: PlanType;
  createdDate: string;
  featureFlags?: Record<string, boolean>;
  promptVersion?: string;
  connectorConfig: {
    primaryConnector?: ConnectorProvider;
    enabledConnectors: ConnectorProvider[];
  };
}
