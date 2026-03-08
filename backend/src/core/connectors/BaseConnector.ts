import type { ConnectorHealthResult } from "../models/connectorModels.js";
import type { Milestone, Project, Task } from "../models/projectModels.js";
import type { TenantContext } from "../models/tenantModels.js";
import type { TimeEntry } from "../models/timeModels.js";

export interface BaseConnector {
  readonly sourceSystem: string;
  getProject(tenantContext: TenantContext, projectId: string): Promise<Project | null>;
  getTasks(tenantContext: TenantContext, projectId: string): Promise<Task[]>;
  getMilestones(tenantContext: TenantContext, projectId: string): Promise<Milestone[]>;
  getStatus(tenantContext: TenantContext, projectId: string): Promise<string>;
  getTimeEntries(
    tenantContext: TenantContext,
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TimeEntry[]>;
  healthCheck(tenantContext: TenantContext): Promise<ConnectorHealthResult>;
}
