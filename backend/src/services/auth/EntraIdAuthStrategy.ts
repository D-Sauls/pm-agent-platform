import type { AdminUser } from "../../models/AdminUser.js";
import type { AdminAuthStrategy, AuthenticatedAdminSession } from "./AdminAuthStrategy.js";

// Placeholder Entra ID strategy; wire token validation and role claims in next phase.
export class EntraIdAuthStrategy implements AdminAuthStrategy {
  readonly mode = "entra" as const;

  async login(_email: string, _password: string): Promise<AuthenticatedAdminSession> {
    throw new Error("Entra ID interactive login flow is not implemented in this scaffold.");
  }

  async validateToken(_token: string): Promise<AdminUser | null> {
    // TODO: validate Entra ID access token and map claims to admin role.
    return null;
  }
}
