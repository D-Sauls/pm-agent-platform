import type { ResourceEffortSummary } from "../../models/timeModels.js";

export class UtilizationService {
  applyUtilization(
    resources: ResourceEffortSummary[],
    availableHoursByUser: Record<string, number> = {}
  ): ResourceEffortSummary[] {
    return resources.map((resource) => {
      const availableHours = availableHoursByUser[resource.userId];
      if (!availableHours || availableHours <= 0) {
        return { ...resource, utilizationPercent: null };
      }
      const utilizationPercent = Number(((resource.totalHours / availableHours) * 100).toFixed(1));
      return { ...resource, utilizationPercent };
    });
  }
}
