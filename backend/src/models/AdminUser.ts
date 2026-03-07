export type AdminRole = "superadmin" | "supportadmin" | "readonlyadmin";

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  isActive: boolean;
}
