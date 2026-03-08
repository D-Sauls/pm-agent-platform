import type { UsageLog } from "../models/tenantModels.js";
import type { UsageLogRepository } from "../repositories/interfaces.js";

interface UsageLogInput {
  tenantId: string;
  userId?: string;
  requestType: string;
  workflowType?: string;
  workflowId?: string;
  forecastType?: string;
  confidenceScore?: number;
  connectorUsed?: string | null;
  responseTimeMs?: number;
  executionTimeMs?: number;
  success: boolean;
  errorMessage?: string | null;
}

interface ForecastLogInput {
  tenantId: string;
  userId?: string;
  forecastType?: "delivery" | "capacity" | "billing" | "full";
  executionTimeMs?: number;
  success: boolean;
  errorMessage?: string | null;
}

export class UsageLogService {
  constructor(private readonly usageLogRepository: UsageLogRepository) {}

  async recordWorkflowRequest(input: UsageLogInput): Promise<void> {
    const log: UsageLog = {
      id: `usage-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      tenantId: input.tenantId,
      userId: input.userId,
      requestType: input.requestType,
      workflowType:
        input.workflowType === "forecast_engine" && input.forecastType
          ? `${input.workflowType}:${input.forecastType}`
          : input.workflowType,
      workflowId: input.workflowId,
      forecastType: input.forecastType,
      confidenceScore: input.confidenceScore,
      connectorUsed: input.connectorUsed ?? null,
      responseTimeMs: input.responseTimeMs,
      executionTimeMs: input.executionTimeMs,
      success: input.success,
      timestamp: new Date(),
      errorMessage: input.errorMessage ?? null
    };
    await this.usageLogRepository.append(log);
  }

  async recordForecastCalculation(input: ForecastLogInput): Promise<void> {
    await this.recordWorkflowRequest({
      tenantId: input.tenantId,
      userId: input.userId,
      requestType: "forecast_generate",
      workflowType: "forecast_engine",
      workflowId: "forecast_engine",
      forecastType: input.forecastType,
      executionTimeMs: input.executionTimeMs,
      success: input.success,
      errorMessage: input.errorMessage
    });
  }

  async queryUsageSummaryByTenant(tenantId: string): Promise<{ totalRequests: number; failed: number }> {
    const rows = await this.usageLogRepository.listByTenant(tenantId);
    return { totalRequests: rows.length, failed: rows.filter((row) => !row.success).length };
  }

  async listRecent(limit = 100): Promise<UsageLog[]> {
    return this.usageLogRepository.listRecent(limit);
  }
}
