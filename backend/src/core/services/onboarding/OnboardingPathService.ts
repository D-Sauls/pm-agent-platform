import { AppError } from "../../errors/AppError.js";
import type { OnboardingPath } from "../../models/onboardingModels.js";
import type { OnboardingPathRepository } from "../../repositories/interfaces.js";

export class OnboardingPathService {
  constructor(private readonly repository: OnboardingPathRepository) {}

  async create(path: OnboardingPath): Promise<OnboardingPath> {
    const existing = await this.repository.getById(path.tenantId, path.id);
    if (existing) {
      throw new AppError("VALIDATION_ERROR", `Onboarding path ${path.id} already exists`, 409);
    }
    return this.repository.create(path);
  }

  async getById(tenantId: string, pathId: string): Promise<OnboardingPath> {
    const path = await this.repository.getById(tenantId, pathId);
    if (!path) {
      throw new AppError("PROJECT_NOT_FOUND", `Onboarding path ${pathId} not found`, 404);
    }
    return path;
  }

  async getByRoleId(tenantId: string, roleId: string): Promise<OnboardingPath | null> {
    const paths = await this.repository.listByTenant(tenantId);
    return paths.find((path) => path.roleId === roleId) ?? null;
  }

  async list(tenantId: string): Promise<OnboardingPath[]> {
    return this.repository.listByTenant(tenantId);
  }
}
