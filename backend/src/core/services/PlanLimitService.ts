import { AppError } from "../errors/AppError.js";
import type { Tenant } from "../models/tenantModels.js";

interface PlanLimit {
  maxEnabledConnectors: number;
}

const PLAN_LIMITS: Record<Tenant["planType"], PlanLimit> = {
  starter: { maxEnabledConnectors: 1 },
  professional: { maxEnabledConnectors: 3 },
  enterprise: { maxEnabledConnectors: 10 }
};

export class PlanLimitService {
  ensureWithinPlanLimits(tenant: Tenant): void {
    const limit = PLAN_LIMITS[tenant.planType];
    if (tenant.enabledConnectors.length > limit.maxEnabledConnectors) {
      throw new AppError(
        "PLAN_LIMIT_EXCEEDED",
        `Tenant ${tenant.tenantId} exceeds plan limits for ${tenant.planType}.`,
        403,
        {
          planType: tenant.planType,
          maxEnabledConnectors: limit.maxEnabledConnectors,
          actualEnabledConnectors: tenant.enabledConnectors.length
        }
      );
    }
  }
}
