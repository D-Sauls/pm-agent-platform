import {
  type DeliveryForecast,
  type DeliveryForecastRules,
  type ForecastInput,
  defaultDeliveryForecastRules
} from "../../models/forecastModels.js";

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 86_400_000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
}

export class DeliveryForecastService {
  constructor(private readonly rules: DeliveryForecastRules = defaultDeliveryForecastRules) {}

  calculate(input: ForecastInput): DeliveryForecast {
    const now = new Date();
    const doneStatuses = new Set(["done", "completed", "closed", "resolved"]);
    const completedTasks = input.tasks.filter((task) => doneStatuses.has((task.status ?? "").toLowerCase()));
    const overdueTasks = input.tasks.filter((task) => {
      if (!task.dueDate) return false;
      const isDone = doneStatuses.has((task.status ?? "").toLowerCase());
      return !isDone && task.dueDate.getTime() < now.getTime();
    });
    const openMilestoneDelays = input.milestones
      .filter((milestone) => !doneStatuses.has((milestone.status ?? "").toLowerCase()) && milestone.targetDate)
      .map((milestone) => Math.max(0, daysBetween(milestone.targetDate!, now)));
    const milestoneVarianceDays = openMilestoneDelays.length > 0 ? Math.max(...openMilestoneDelays) : 0;
    const dependencyBlockers = (input.dependencies ?? []).length;
    const explicitBlockers = (input.issues ?? []).filter((issue) => {
      const text = `${issue.title} ${issue.severity ?? ""}`.toLowerCase();
      return text.includes("block") || text.includes("critical");
    }).length;
    const blockers = Math.max(dependencyBlockers, explicitBlockers);

    const riskLevel = this.classifyRisk(overdueTasks.length, milestoneVarianceDays, blockers);
    const status = riskLevel === "high" ? "red" : riskLevel === "medium" ? "amber" : "green";

    return {
      status,
      trend: {
        overdueTasks: overdueTasks.length,
        tasksCompleted: completedTasks.length,
        tasksRemaining: Math.max(0, input.tasks.length - completedTasks.length),
        milestoneVarianceDays,
        dependencyBlockers: blockers
      },
      blockers,
      milestoneVarianceDays,
      riskLevel
    };
  }

  private classifyRisk(
    overdueTasks: number,
    milestoneVarianceDays: number,
    dependencyBlockers: number
  ): "low" | "medium" | "high" {
    if (
      overdueTasks >= this.rules.redOverdueTasks ||
      milestoneVarianceDays >= this.rules.redMilestoneVarianceDays ||
      dependencyBlockers >= this.rules.redDependencyBlockers
    ) {
      return "high";
    }
    if (
      overdueTasks >= this.rules.amberOverdueTasks ||
      milestoneVarianceDays >= this.rules.amberMilestoneVarianceDays ||
      dependencyBlockers >= this.rules.amberDependencyBlockers
    ) {
      return "medium";
    }
    return "low";
  }
}
