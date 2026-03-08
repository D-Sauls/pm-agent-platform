import type {
  CapacityForecast,
  CapacitySnapshot,
  ForecastInput,
  TimeEntry
} from "../../models/forecastModels.js";

interface CapacityMetadataEntry {
  availableHours?: number;
  estimatedHours?: number;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export class CapacityForecastService {
  calculate(input: ForecastInput): CapacityForecast {
    const metadataCapacity = (input.metadata?.capacityByUser as Record<string, CapacityMetadataEntry> | undefined) ?? {};
    const tasksByUser = new Map<string, number>();
    for (const task of input.tasks) {
      const assignee = task.assignee ?? "unassigned";
      tasksByUser.set(assignee, (tasksByUser.get(assignee) ?? 0) + 1);
    }

    const hoursByUser = this.groupHoursByUser(input.timeEntries ?? []);
    const users = new Set<string>([
      ...tasksByUser.keys(),
      ...Object.keys(metadataCapacity),
      ...hoursByUser.keys()
    ]);

    const snapshots: CapacitySnapshot[] = Array.from(users).map((userId) => {
      const metadata = metadataCapacity[userId] ?? {};
      const assignedTasks = tasksByUser.get(userId) ?? 0;
      const estimatedHours = metadata.estimatedHours ?? hoursByUser.get(userId) ?? assignedTasks * 6;
      const availableHours = metadata.availableHours ?? 40;
      const utilizationPercent =
        availableHours > 0 ? Number(((estimatedHours / availableHours) * 100).toFixed(1)) : undefined;
      return {
        userId,
        assignedTasks,
        estimatedHours,
        availableHours,
        utilizationPercent
      };
    });

    const overloadedUsers = snapshots
      .filter((snapshot) => {
        const estimated = snapshot.estimatedHours ?? 0;
        const available = snapshot.availableHours ?? 0;
        return available > 0 && estimated > available;
      })
      .map((snapshot) => snapshot.userId);

    const utilizationAverage = Number(
      average(
        snapshots
          .map((snapshot) => snapshot.utilizationPercent)
          .filter((value): value is number => typeof value === "number")
      ).toFixed(1)
    );

    let capacityRisk: "low" | "medium" | "high" = "low";
    if (overloadedUsers.length > 0 || utilizationAverage > 95) {
      capacityRisk = "high";
    } else if (utilizationAverage > 80) {
      capacityRisk = "medium";
    }

    return {
      capacityRisk,
      overloadedUsers,
      utilizationAverage,
      snapshots
    };
  }

  private groupHoursByUser(timeEntries: TimeEntry[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const entry of timeEntries) {
      const user = entry.userId ?? "unassigned";
      map.set(user, (map.get(user) ?? 0) + entry.hours);
    }
    return map;
  }
}
