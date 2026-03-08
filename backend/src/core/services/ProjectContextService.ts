import { AppError } from "../errors/AppError.js";
import type { NormalizedProjectContext, Project } from "../models/projectModels.js";
import type { TenantContext } from "../models/tenantModels.js";
import type { ProjectRepository } from "../repositories/interfaces.js";
import { ConnectorRouter } from "./ConnectorRouter.js";
import { TimeEntryService } from "./time/TimeEntryService.js";

export class ProjectContextService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly connectorRouter: ConnectorRouter,
    private readonly timeEntryService?: TimeEntryService
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
    const [resolvedProject, tasks, milestones, statusSummary, timeEntries] = await Promise.all([
      connector.getProject(tenantContext, externalProjectId),
      connector.getTasks(tenantContext, externalProjectId),
      connector.getMilestones(tenantContext, externalProjectId),
      connector.getStatus(tenantContext, externalProjectId),
      connector.getTimeEntries(tenantContext, externalProjectId)
    ]);
    if (this.timeEntryService && timeEntries.length > 0) {
      await this.timeEntryService.ingest(timeEntries);
    }

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
        const status = await connector.healthCheck(tenantContext);
        return { connector: status.connectorName, healthy: status.status === "healthy" };
      })
    );
  }
}
