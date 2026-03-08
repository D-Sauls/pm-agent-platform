import { AppError } from "../errors/AppError.js";
import type { NormalizedProjectContext, Project } from "../models/projectModels.js";
import type { TenantContext } from "../models/tenantModels.js";
import type { ProjectRepository } from "../repositories/interfaces.js";
import { ConnectorRouter } from "./ConnectorRouter.js";
import { TimeEntryService } from "./time/TimeEntryService.js";
import type { ConnectorTelemetryService } from "../../observability/ConnectorTelemetryService.js";
import type { RetryPolicyService } from "../../observability/RetryPolicyService.js";

export class ProjectContextService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly connectorRouter: ConnectorRouter,
    private readonly timeEntryService?: TimeEntryService,
    private readonly retryPolicyService?: RetryPolicyService,
    private readonly connectorTelemetryService?: ConnectorTelemetryService
  ) {}

  async getProjectContext(
    tenantContext: TenantContext,
    projectId: string
  ): Promise<NormalizedProjectContext> {
    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      throw new AppError("PROJECT_NOT_FOUND", `Project ${projectId} not found`, 404);
    }
    if (project.tenantId !== tenantContext.tenant.tenantId) {
      throw new AppError("PROJECT_NOT_FOUND", `Project ${projectId} not found for tenant`, 404);
    }

    return this.resolveFromProject(tenantContext, project);
  }

  async resolveFromProject(
    tenantContext: TenantContext,
    project: Project
  ): Promise<NormalizedProjectContext> {
    const connector = this.connectorRouter.resolveConnector(tenantContext, project.sourceSystem);
    const externalProjectId = project.externalProjectId ?? project.projectId;
    const start = Date.now();

    const runWithRetry = <T>(operation: string, action: () => Promise<T>): Promise<T> => {
      if (!this.retryPolicyService) {
        return action();
      }
      return this.retryPolicyService.execute(`connector.${project.sourceSystem}.${operation}`, action, {
        maxAttempts: 2,
        baseDelayMs: 120
      });
    };

    const [resolvedProject, tasks, milestones, statusSummary, timeEntries] = await Promise.all([
      runWithRetry("getProject", () => connector.getProject(tenantContext, externalProjectId)),
      runWithRetry("getTasks", () => connector.getTasks(tenantContext, externalProjectId)),
      runWithRetry("getMilestones", () => connector.getMilestones(tenantContext, externalProjectId)),
      runWithRetry("getStatus", () => connector.getStatus(tenantContext, externalProjectId)),
      runWithRetry("getTimeEntries", () => connector.getTimeEntries(tenantContext, externalProjectId))
    ]);
    if (this.timeEntryService && timeEntries.length > 0) {
      await this.timeEntryService.ingest(timeEntries);
    }

    this.connectorTelemetryService?.record({
      requestId: "system-project-context",
      tenantId: tenantContext.tenant.tenantId,
      connectorName: connector.sourceSystem,
      operation: "project_context_fetch",
      status: "healthy",
      responseTimeMs: Date.now() - start
    });

    return {
      project: resolvedProject ?? project,
      tasks,
      milestones,
      risks: [],
      issues: [],
      dependencies: [],
      statusSummary,
      timeEntries
    };
  }

  async healthForTenant(tenantContext: TenantContext): Promise<{ connector: string; healthy: boolean }[]> {
    return Promise.all(
      tenantContext.enabledConnectors.map(async (sourceSystem) => {
        const connector = this.connectorRouter.resolveConnector(tenantContext, sourceSystem);
        const start = Date.now();
        const status = await connector.healthCheck(tenantContext);
        this.connectorTelemetryService?.record({
          requestId: "system-connector-health",
          tenantId: tenantContext.tenant.tenantId,
          connectorName: status.connectorName,
          operation: "health_check",
          status:
            status.status === "unhealthy"
              ? "unhealthy"
              : status.status === "degraded"
                ? "degraded"
                : "healthy",
          responseTimeMs: Date.now() - start,
          reason: status.message
        });
        return { connector: status.connectorName, healthy: status.status === "healthy" };
      })
    );
  }
}
