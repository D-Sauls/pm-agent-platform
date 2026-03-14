export type AdminPageKey =
  | "dashboard"
  | "tenants"
  | "tenantDetail"
  | "licenses"
  | "featureFlags"
  | "prompts"
  | "enhancements"
  | "connectors"
  | "compliance"
  | "logs";

export interface AdminUserVm {
  id: string;
  email: string;
  displayName: string;
  role: "superadmin" | "supportadmin" | "readonlyadmin";
}
