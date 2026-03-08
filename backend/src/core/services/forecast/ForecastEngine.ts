import type { ForecastInput, ForecastResult } from "../../models/forecastModels.js";
import { BillingForecastService } from "./BillingForecastService.js";
import { CapacityForecastService } from "./CapacityForecastService.js";
import { DeliveryForecastService } from "./DeliveryForecastService.js";

export class ForecastEngine {
  constructor(
    private readonly deliveryForecastService = new DeliveryForecastService(),
    private readonly capacityForecastService = new CapacityForecastService(),
    private readonly billingForecastService = new BillingForecastService()
  ) {}

  generate(input: ForecastInput): ForecastResult {
    const deliveryForecast = this.deliveryForecastService.calculate(input);
    const capacityForecast = this.capacityForecastService.calculate(input);
    const billingForecast = this.billingForecastService.calculate(input);

    return {
      deliveryForecast,
      capacityForecast,
      billingForecast,
      confidenceScore: this.computeConfidence(input),
      generatedAt: new Date()
    };
  }

  private computeConfidence(input: ForecastInput): number {
    let confidence = 0.55;
    if (input.tasks.length > 0) confidence += 0.12;
    if (input.milestones.length > 0) confidence += 0.1;
    if ((input.issues ?? []).length > 0 || (input.dependencies ?? []).length > 0) confidence += 0.08;
    if ((input.timeEntries ?? []).length > 0) confidence += 0.12;
    return Number(Math.min(0.95, confidence).toFixed(2));
  }
}
