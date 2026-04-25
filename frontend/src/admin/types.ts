export type AdminPageKey =
  | "dashboard"
  | "employees"
  | "employeeDetail"
  | "hrImport"
  | "content"
  | "settings";

export interface AdminUserVm {
  id: string;
  email: string;
  displayName: string;
  role: "superadmin" | "supportadmin" | "readonlyadmin";
}
