import type { BillingForecast, ForecastInput } from "../../models/forecastModels.js";

function round(value: number): number {
  return Number(value.toFixed(2));
}

export class BillingForecastService {
  calculate(input: ForecastInput): BillingForecast {
    const entries = input.timeEntries ?? [];
    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const billableHours = entries.filter((entry) => entry.billable).reduce((sum, entry) => sum + entry.hours, 0);
    const nonBillableHours = Math.max(0, totalHours - billableHours);
    const billableRatio = totalHours > 0 ? round(billableHours / totalHours) : 0;
    const { projectedWeeklyHours, projectedMonthlyHours } = this.projectEffort(entries, totalHours);

    return {
      totalHours: round(totalHours),
      billableHours: round(billableHours),
      nonBillableHours: round(nonBillableHours),
      billableRatio,
      projectedWeeklyHours,
      projectedMonthlyHours
    };
  }

  private projectEffort(
    entries: ForecastInput["timeEntries"],
    totalHours: number
  ): { projectedWeeklyHours: number; projectedMonthlyHours: number } {
    const timeEntries = entries ?? [];
    if (timeEntries.length === 0) {
      return { projectedWeeklyHours: 0, projectedMonthlyHours: 0 };
    }

    const timestamps = timeEntries.map((entry) => entry.date.getTime());
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const days = Math.max(1, Math.ceil((maxTs - minTs) / 86_400_000) + 1);
    const avgDailyHours = totalHours / days;

    return {
      projectedWeeklyHours: round(avgDailyHours * 7),
      projectedMonthlyHours: round(avgDailyHours * 30)
    };
  }
}
