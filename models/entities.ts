export type DeliveryMode = "Waterfall" | "AgileLean" | "HybridPrince2Agile";

export interface Project {
  id: string;
  name: string;
  owner: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: string;
  assignee?: string;
  dueDate?: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  targetDate: string;
  status: string;
}

export interface Risk {
  id: string;
  projectId: string;
  summary: string;
  probability: "Low" | "Medium" | "High";
  impact: "Low" | "Medium" | "High";
  mitigation?: string;
}

export interface Issue {
  id: string;
  projectId: string;
  summary: string;
  severity: "Low" | "Medium" | "High";
  owner?: string;
}

export interface Dependency {
  id: string;
  projectId: string;
  summary: string;
  owner?: string;
  dueDate?: string;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface StatusReport {
  id: string;
  projectId: string;
  periodStart: string;
  periodEnd: string;
  highlights: string[];
  blockers: string[];
  nextSteps: string[];
}

export interface WeeklyHighlightReport {
  projectSummary: string;
  achievementsThisPeriod: string[];
  upcomingWork: string[];
  risksIssues: string[];
  dependencies: string[];
  decisionsRequired: string[];
  overallRagStatus: "Red" | "Amber" | "Green";
}

export interface ChangeRequest {
  id: string;
  projectId: string;
  title: string;
  impactSummary: string;
  recommendation: string;
}

export interface RaidLog {
  risks: Risk[];
  issues: Issue[];
  assumptions: string[];
  dependencies: Dependency[];
}

// Canonical model consumed by reporting and agent orchestration.
export interface NormalizedProjectSnapshot {
  sourceSystem: string;
  project: Project;
  tasks: Task[];
  milestones: Milestone[];
  risks: Risk[];
  issues: Issue[];
  dependencies: Dependency[];
  sprints: Sprint[];
}
