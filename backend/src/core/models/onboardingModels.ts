import type { Course, KnowledgeDocument, Policy } from "./knowledgeModels.js";

export interface RoleProfile {
  id: string;
  tenantId: string;
  roleName: string;
  department: string;
  description: string;
}

export interface OnboardingPath {
  id: string;
  tenantId: string;
  roleId: string;
  courseIds: string[];
  policyIds: string[];
  estimatedDuration: number;
  version: string;
}

export interface OnboardingProgress {
  userId: string;
  onboardingPathId: string;
  completedItems: string[];
  remainingItems: string[];
  completionPercentage: number;
}

export interface OnboardingRecommendationResult {
  workflowId: "onboarding_recommendation";
  resultType: "onboarding_recommendation";
  roleProfile: RoleProfile | null;
  onboardingPath: OnboardingPath | null;
  recommendedCourses: Course[];
  requiredPolicies: Policy[];
  nextActions: string[];
  generatedAt: Date;
  warnings: string[];
}

export interface NextTrainingStepResult {
  workflowId: "next_training_step";
  resultType: "next_training_step";
  userId: string;
  onboardingPathId: string | null;
  nextCourseId: string | null;
  nextPolicyId: string | null;
  recommendation: string;
  completionPercentage: number;
  generatedAt: Date;
  warnings: string[];
}

export interface RoleKnowledgeLookupResult {
  workflowId: "role_knowledge_lookup";
  resultType: "role_knowledge_lookup";
  roleName: string;
  department?: string | null;
  courses: Course[];
  policies: Policy[];
  documents: KnowledgeDocument[];
  generatedAt: Date;
  warnings: string[];
}
