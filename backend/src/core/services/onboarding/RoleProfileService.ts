import { AppError } from "../../errors/AppError.js";
import type { RoleProfile } from "../../models/onboardingModels.js";
import type { RoleProfileRepository } from "../../repositories/interfaces.js";

export class RoleProfileService {
  constructor(private readonly repository: RoleProfileRepository) {}

  async create(roleProfile: RoleProfile): Promise<RoleProfile> {
    const existing = await this.repository.getById(roleProfile.tenantId, roleProfile.id);
    if (existing) {
      throw new AppError("VALIDATION_ERROR", `Role profile ${roleProfile.id} already exists`, 409);
    }
    return this.repository.create(roleProfile);
  }

  async getById(tenantId: string, roleId: string): Promise<RoleProfile> {
    const role = await this.repository.getById(tenantId, roleId);
    if (!role) {
      throw new AppError("PROJECT_NOT_FOUND", `Role profile ${roleId} not found`, 404);
    }
    return role;
  }

  async findByRole(tenantId: string, roleName: string, department?: string): Promise<RoleProfile | null> {
    const normalizedRole = roleName.toLowerCase();
    const normalizedDepartment = department?.toLowerCase();
    const roles = await this.repository.listByTenant(tenantId);
    return (
      roles.find(
        (role) =>
          role.roleName.toLowerCase() === normalizedRole &&
          (!normalizedDepartment || role.department.toLowerCase() === normalizedDepartment)
      ) ?? null
    );
  }

  async list(tenantId: string): Promise<RoleProfile[]> {
    return this.repository.listByTenant(tenantId);
  }
}
