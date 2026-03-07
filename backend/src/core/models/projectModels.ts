export type DeliveryMode = "waterfall" | "agile" | "hybrid";

export interface Project {
  projectId: string;
  tenantId: string;
  sourceSystem: string;
  externalProjectId?: string;
  name: string;
  summary?: string;
  deliveryMode: DeliveryMode;
  status?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  owner?: string | null;
  tags?: string[];
}

export interface Task {
  taskId: string;
  projectId: string;
  sourceSystem: string;
  title: string;
  description?: string;
  status?: string;
  assignee?: string | null;
  dueDate?: Date | null;
  priority?: string | null;
}

export interface Milestone {
  milestoneId: string;
  projectId: string;
  sourceSystem: string;
  title: string;
  targetDate?: Date | null;
  status?: string;
}

export interface Risk {
  riskId: string;
  projectId: string;
  sourceSystem: string;
  title: string;
  impact?: string;
  probability?: string;
}

export interface Issue {
  issueId: string;
  projectId: string;
  sourceSystem: string;
  title: string;
  severity?: string;
}

export interface Dependency {
  dependencyId: string;
  projectId: string;
  sourceSystem: string;
  title: string;
  owner?: string | null;
}

export interface Sprint {
  sprintId: string;
  projectId: string;
  sourceSystem: string;
  name: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface StatusReport {
  reportId: string;
  projectId: string;
  summary: string;
  generatedAt: Date;
}

export interface ChangeRequest {
  changeRequestId: string;
  projectId: string;
  title: string;
  impactSummary: string;
}

export interface NormalizedProjectContext {
  project: Project;
  tasks: Task[];
  milestones: Milestone[];
  risks: Risk[];
  issues: Issue[];
  dependencies: Dependency[];
  statusSummary: string;
}

export interface WeeklyReportOutput {
  projectSummary: string;
  achievementsThisPeriod: string[];
  upcomingWork: string[];
  risksIssues: string[];
  dependencies: string[];
  decisionsRequired: string[];
  overallRagStatus: "Red" | "Amber" | "Green";
  assumptions: string[];
  generatedAt: Date;
}
