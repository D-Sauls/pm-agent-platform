import { AppError } from "../../errors/AppError.js";
import type { RoleProfile } from "../../models/onboardingModels.js";

export class RoleProfileService {
  private readonly roles = new Map<string, RoleProfile>();

  create(roleProfile: RoleProfile): RoleProfile {
    if (this.roles.has(roleProfile.id)) {
      throw new AppError("VALIDATION_ERROR", `Role profile ${roleProfile.id} already exists`, 409);
    }
    this.roles.set(roleProfile.id, roleProfile);
    return roleProfile;
  }

  getById(tenantId: string, roleId: string): RoleProfile {
    const role = this.roles.get(roleId);
    if (!role || role.tenantId !== tenantId) {
      throw new AppError("PROJECT_NOT_FOUND", `Role profile ${roleId} not found`, 404);
    }
    return role;
  }

  findByRole(tenantId: string, roleName: string, department?: string): RoleProfile | null {
    const normalizedRole = roleName.toLowerCase();
    const normalizedDepartment = department?.toLowerCase();
    return (
      Array.from(this.roles.values()).find(
        (role) =>
          role.tenantId === tenantId &&
          role.roleName.toLowerCase() === normalizedRole &&
          (!normalizedDepartment || role.department.toLowerCase() === normalizedDepartment)
      ) ?? null
    );
  }

  list(tenantId: string): RoleProfile[] {
    return Array.from(this.roles.values()).filter((role) => role.tenantId === tenantId);
  }

  seed(roleProfiles: RoleProfile[]): void {
    for (const roleProfile of roleProfiles) {
      this.roles.set(roleProfile.id, roleProfile);
    }
  }
}
