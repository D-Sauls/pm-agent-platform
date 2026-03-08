import type { ForecastInput, ForecastResult, TimeEntry } from "../models/forecastModels.js";
import type { TenantContext } from "../models/tenantModels.js";
import { AppError } from "../errors/AppError.js";
import { ForecastEngine } from "./forecast/ForecastEngine.js";
import { ProjectContextService } from "./ProjectContextService.js";
import { UsageLogService } from "./UsageLogService.js";

export class ForecastService {
  constructor(
    private readonly forecastEngine: ForecastEngine,
    private readonly usageLogService: UsageLogService,
    private readonly projectContextService?: ProjectContextService
  ) {}

  async generateForecast(input: ForecastInput): Promise<ForecastResult> {
    const start = Date.now();
    try {
      const result = this.forecastEngine.generate(input);
      await this.usageLogService.recordForecastCalculation({
        tenantId: input.tenantId,
        executionTimeMs: Date.now() - start,
        success: true
      });
      return result;
    } catch (error) {
      await this.usageLogService.recordForecastCalculation({
        tenantId: input.tenantId,
        executionTimeMs: Date.now() - start,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Forecast generation failed"
      });
      throw error;
    }
  }

  async generateForecastForProject(
    tenantContext: TenantContext,
    projectId: string,
    options?: { timeEntries?: TimeEntry[]; metadata?: Record<string, unknown> }
  ): Promise<ForecastResult> {
    if (!this.projectContextService) {
      throw new AppError(
        "WORKFLOW_EXECUTION_FAILED",
        "ProjectContextService is required to generate project-based forecast",
        500
      );
    }

    const projectContext = await this.projectContextService.getProjectContext(tenantContext, projectId);
    return this.generateForecast({
      tenantId: tenantContext.tenant.tenantId,
      projectId,
      tasks: projectContext.tasks,
      milestones: projectContext.milestones,
      risks: projectContext.risks,
      issues: projectContext.issues,
      dependencies: projectContext.dependencies,
      timeEntries: options?.timeEntries ?? [],
      projectStartDate: projectContext.project.startDate ?? undefined,
      projectEndDate: projectContext.project.endDate ?? undefined,
      metadata: options?.metadata
    });
  }
}
