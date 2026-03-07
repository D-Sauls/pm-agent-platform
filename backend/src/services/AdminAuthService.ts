import { env } from "../config/env.js";
import type { AdminUser } from "../models/AdminUser.js";
import { EntraIdAuthStrategy } from "./auth/EntraIdAuthStrategy.js";
import { LocalAdminAuthStrategy } from "./auth/LocalAdminAuthStrategy.js";
import type { AdminAuthStrategy, AuthenticatedAdminSession } from "./auth/AdminAuthStrategy.js";

// Selects auth mode and validates admin sessions for control-plane routes.
export class AdminAuthService {
  private readonly localStrategy = new LocalAdminAuthStrategy();
  private readonly entraStrategy = new EntraIdAuthStrategy();

  private resolveStrategy(): AdminAuthStrategy {
    if (env.nodeEnv === "development" && env.adminAuthMode === "local") {
      return this.localStrategy;
    }
    return this.entraStrategy;
  }

  getMode(): "local" | "entra" {
    return this.resolveStrategy().mode;
  }

  async login(email: string, password: string): Promise<AuthenticatedAdminSession> {
    return this.resolveStrategy().login(email, password);
  }

  async validateToken(token: string): Promise<AdminUser | null> {
    return this.resolveStrategy().validateToken(token);
  }
}
