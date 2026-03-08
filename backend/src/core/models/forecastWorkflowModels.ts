import type {
  BillingForecast,
  CapacityForecast,
  DeliveryForecast
} from "./forecastModels.js";

export interface ForecastWorkflowInput {
  tenantId: string;
  projectId?: string;
  forecastType?: "delivery" | "capacity" | "billing" | "full";
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface ForecastWorkflowResult {
  workflowId: "forecast";
  resultType: "forecast";
  deliveryForecast: DeliveryForecast;
  capacityForecast: CapacityForecast;
  billingForecast: BillingForecast;
  forecastExplanation: string;
  recommendedActions: string[];
  assumptionsMade: string[];
  warnings: string[];
  generatedAt: Date;
}
