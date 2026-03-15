import { AppError } from "../../errors/AppError.js";
import type { OnboardingPath } from "../../models/onboardingModels.js";

export class OnboardingPathService {
  private readonly paths = new Map<string, OnboardingPath>();

  create(path: OnboardingPath): OnboardingPath {
    if (this.paths.has(path.id)) {
      throw new AppError("VALIDATION_ERROR", `Onboarding path ${path.id} already exists`, 409);
    }
    this.paths.set(path.id, path);
    return path;
  }

  getById(tenantId: string, pathId: string): OnboardingPath {
    const path = this.paths.get(pathId);
    if (!path || path.tenantId !== tenantId) {
      throw new AppError("PROJECT_NOT_FOUND", `Onboarding path ${pathId} not found`, 404);
    }
    return path;
  }

  getByRoleId(tenantId: string, roleId: string): OnboardingPath | null {
    return Array.from(this.paths.values()).find((path) => path.tenantId === tenantId && path.roleId === roleId) ?? null;
  }

  list(tenantId: string): OnboardingPath[] {
    return Array.from(this.paths.values()).filter((path) => path.tenantId === tenantId);
  }

  seed(paths: OnboardingPath[]): void {
    for (const path of paths) {
      this.paths.set(path.id, path);
    }
  }
}
