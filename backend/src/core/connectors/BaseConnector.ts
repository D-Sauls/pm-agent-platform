import type { Milestone, Project, Task } from "../models/projectModels.js";

export interface ConnectorStatus {
  connector: string;
  healthy: boolean;
  message?: string;
}

export interface BaseConnector {
  readonly sourceSystem: string;
  getProject(projectId: string): Promise<Project | null>;
  getTasks(projectId: string): Promise<Task[]>;
  getMilestones(projectId: string): Promise<Milestone[]>;
  getStatus(projectId: string): Promise<string>;
  healthCheck(): Promise<ConnectorStatus>;
}
