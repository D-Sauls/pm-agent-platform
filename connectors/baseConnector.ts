export type ConnectorProvider =
  | "microsoft-graph"
  | "clickup"
  | "zoho"
  | "monday"
  | "microsoft-planner"
  | "microsoft-project";

export interface ExternalTask {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  dueDate?: string;
}

export interface ExternalMilestone {
  id: string;
  name: string;
  targetDate: string;
  status: string;
}

export interface ExternalProjectData {
  provider: ConnectorProvider;
  project: {
    id: string;
    name: string;
    owner: string;
    status: string;
  };
  tasks: ExternalTask[];
  milestones: ExternalMilestone[];
}

// Base interface for project management system connectors.
export interface BaseConnector {
  provider: ConnectorProvider;
  fetchProjectData(projectId: string): Promise<ExternalProjectData>;
}
