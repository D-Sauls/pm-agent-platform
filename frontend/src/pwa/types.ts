export interface EmployeeSession {
  userId: string;
  tenantId: string;
  displayName: string;
  role: string;
  department?: string;
  sessionToken?: string;
}

export interface TenantBranding {
  appName: string;
  logoText: string;
  primaryColor: string;
  accentColor: string;
  welcomeMessage: string;
}

export interface EmployeeCourse {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  tags: string[];
  roleTargets: string[];
  publishedStatus: "draft" | "published";
  modules: Array<{
    id: string;
    courseId: string;
    title: string;
    lessons: Array<{
      id: string;
      moduleId: string;
      title: string;
      contentType: "video" | "markdown" | "pdf" | "external_reference";
      contentReference: string;
      estimatedDuration: number;
    }>;
  }>;
}

export interface EmployeePolicy {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  documentReference: string;
  tags: string[];
  applicableRoles: string[];
}

export interface DownloadRecord {
  id: string;
  title: string;
  urls: string[];
  downloadedAt: string;
  status: "ready" | "blocked" | "pending_sync";
  reason?: string;
}

export interface ProgressQueueItem {
  id: string;
  path: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface EmployeeOnboardingRecommendation {
  roleProfile: { id: string; roleName: string; department: string; description: string } | null;
  onboardingPath: { id: string; courseIds: string[]; policyIds: string[]; estimatedDuration: number; version: string } | null;
  recommendedCourses: EmployeeCourse[];
  requiredPolicies: EmployeePolicy[];
  nextActions: string[];
}

export interface EmployeeOnboardingProgress {
  recommendation: EmployeeOnboardingRecommendation;
  progress: {
    onboardingPathId: string;
    completedItems: string[];
    remainingItems: string[];
    completionPercentage: number;
  } | null;
  nextStep: {
    nextCourseId: string | null;
    nextPolicyId: string | null;
    recommendation: string;
    completionPercentage: number;
  } | null;
}

export type EmployeePage =
  | "login"
  | "dashboard"
  | "assigned"
  | "catalog"
  | "course"
  | "lesson"
  | "policies"
  | "policy"
  | "progress"
  | "compliance"
  | "assistant"
  | "downloads"
  | "profile";
