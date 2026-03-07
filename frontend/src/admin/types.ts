export type AdminPageKey =
  | "dashboard"
  | "tenants"
  | "tenantDetail"
  | "licenses"
  | "featureFlags"
  | "prompts"
  | "enhancements"
  | "connectors"
  | "logs";

export interface AdminUserVm {
  id: string;
  email: string;
  displayName: string;
  role: "superadmin" | "supportadmin" | "readonlyadmin";
}
