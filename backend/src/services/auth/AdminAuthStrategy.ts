import type { AdminUser } from "../../models/AdminUser.js";

export interface AuthenticatedAdminSession {
  token: string;
  user: AdminUser;
}

export interface AdminAuthStrategy {
  readonly mode: "local" | "entra";
  login(email: string, password: string): Promise<AuthenticatedAdminSession>;
  validateToken(token: string): Promise<AdminUser | null>;
}
