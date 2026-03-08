import type { BaseConnector } from "../BaseConnector.js";
import { AppError } from "../../errors/AppError.js";
import type { ConnectorHealthResult } from "../../models/connectorModels.js";
import type { Milestone, Project, Task } from "../../models/projectModels.js";
import type { TenantContext } from "../../models/tenantModels.js";
import type { TimeEntry } from "../../models/timeModels.js";
import { ConnectorConfigService } from "../../services/connectors/ConnectorConfigService.js";
import { HttpClickUpClient, type ClickUpClient } from "./ClickUpClient.js";
import {
  mapClickUpMilestone,
  mapClickUpProject,
  mapClickUpStatus,
  mapClickUpTask,
  mapClickUpTimeEntry
} from "./ClickUpMappers.js";

export class ClickUpConnector implements BaseConnector {
  readonly sourceSystem = "clickup";

  constructor(
    private readonly configService: ConnectorConfigService,
    private readonly client: ClickUpClient = new HttpClickUpClient()
  ) {}

  async getProject(tenantContext: TenantContext, projectId: string): Promise<Project | null> {
    const { config, apiKey } = await this.configService.resolveConnectorAuth(
      tenantContext.tenant.tenantId,
      this.sourceSystem
    );
    const listId = this.resolveListId(config, projectId);
    const list = await this.client.getList(listId, apiKey, config.baseUrl ?? undefined);
    return mapClickUpProject(tenantContext.tenant.tenantId, list, config);
  }

  async getTasks(tenantContext: TenantContext, projectId: string): Promise<Task[]> {
    const { config, apiKey } = await this.configService.resolveConnectorAuth(
      tenantContext.tenant.tenantId,
      this.sourceSystem
    );
    const listId = this.resolveListId(config, projectId);
    const tasks = await this.client.getTasks(listId, apiKey, config.baseUrl ?? undefined);
    return tasks.map((task) => mapClickUpTask(projectId, task));
  }

  async getMilestones(tenantContext: TenantContext, projectId: string): Promise<Milestone[]> {
    const { config, apiKey } = await this.configService.resolveConnectorAuth(
      tenantContext.tenant.tenantId,
      this.sourceSystem
    );
    const listId = this.resolveListId(config, projectId);
    const tasks = await this.client.getTasks(listId, apiKey, config.baseUrl ?? undefined);
    return tasks
      .filter((task) => this.isMilestoneLike(task))
      .map((task) => mapClickUpMilestone(projectId, task));
  }

  async getStatus(tenantContext: TenantContext, projectId: string): Promise<string> {
    const tasks = await this.getTasks(tenantContext, projectId);
    return mapClickUpStatus(tasks);
  }

  async getTimeEntries(
    tenantContext: TenantContext,
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TimeEntry[]> {
    const { config, apiKey } = await this.configService.resolveConnectorAuth(
      tenantContext.tenant.tenantId,
      this.sourceSystem
    );
    if (!config.teamId) {
      return [];
    }
    const entries = await this.client.getTimeEntries(
      config.teamId,
      apiKey,
      config.baseUrl ?? undefined,
      startDate,
      endDate
    );
    return entries.map((entry) =>
      mapClickUpTimeEntry(tenantContext.tenant.tenantId, projectId, entry)
    );
  }

  async healthCheck(tenantContext: TenantContext): Promise<ConnectorHealthResult> {
    const tenantId = tenantContext.tenant.tenantId;
    try {
      const { config, apiKey } = await this.configService.resolveConnectorAuth(
        tenantId,
        this.sourceSystem
      );
      const listId = this.resolveListId(config, undefined);
      await this.client.getList(listId, apiKey, config.baseUrl ?? undefined);
      return {
        connectorName: this.sourceSystem,
        tenantId,
        status: "healthy",
        checkedAt: new Date(),
        message: "ClickUp connector is reachable and authenticated",
        details: { listId, teamId: config.teamId ?? null }
      };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          connectorName: this.sourceSystem,
          tenantId,
          status: error.code === "CONNECTOR_AUTH_FAILED" ? "unhealthy" : "degraded",
          checkedAt: new Date(),
          message: error.message,
          details: { code: error.code }
        };
      }
      return {
        connectorName: this.sourceSystem,
        tenantId,
        status: "unhealthy",
        checkedAt: new Date(),
        message: "Unknown ClickUp health check failure"
      };
    }
  }

  private resolveListId(config: { listId?: string | null }, projectId?: string): string {
    const listId = projectId || config.listId;
    if (!listId) {
      throw new AppError(
        "CONNECTOR_CONFIG_NOT_FOUND",
        "ClickUp listId missing in connector config and no projectId override provided",
        400
      );
    }
    return listId;
  }

  private isMilestoneLike(task: { name: string; status?: { type?: string } }): boolean {
    const name = task.name.toLowerCase();
    return name.includes("milestone") || task.status?.type === "milestone";
  }
}
