import { env } from "../../config/env.js";
import type { AdminUser } from "../../models/AdminUser.js";
import type { AdminAuthStrategy, AuthenticatedAdminSession } from "./AdminAuthStrategy.js";

interface LocalAdminRecord extends AdminUser {
  password: string;
}

// Development-only local auth for internal admin console testing.
export class LocalAdminAuthStrategy implements AdminAuthStrategy {
  readonly mode = "local" as const;
  private seededAdmin: LocalAdminRecord = {
    id: "admin-local-1",
    email: "admin@local.dev",
    password: "ChangeMe123!",
    displayName: "Local Admin",
    role: "superadmin",
    isActive: true
  };

  private sessionStore = new Map<string, AdminUser>();

  async login(email: string, password: string): Promise<AuthenticatedAdminSession> {
    if (env.nodeEnv !== "development") {
      throw new Error("Local admin authentication is disabled outside development.");
    }
    if (email !== this.seededAdmin.email || password !== this.seededAdmin.password) {
      throw new Error("Invalid local admin credentials.");
    }

    const user: AdminUser = {
      id: this.seededAdmin.id,
      email: this.seededAdmin.email,
      displayName: this.seededAdmin.displayName,
      role: this.seededAdmin.role,
      isActive: true
    };
    const token = `local-admin-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    this.sessionStore.set(token, user);
    return { token, user };
  }

  async validateToken(token: string): Promise<AdminUser | null> {
    if (env.nodeEnv !== "development") {
      return null;
    }
    return this.sessionStore.get(token) ?? null;
  }
}
