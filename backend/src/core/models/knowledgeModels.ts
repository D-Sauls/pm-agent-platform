export type PublishedStatus = "draft" | "published";
export type LessonContentType = "video" | "markdown" | "pdf" | "external_reference";
export type CompletionStatus = "not_started" | "in_progress" | "completed";
export type KnowledgeSourceType = "course" | "lesson" | "policy" | "document";

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  contentType: LessonContentType;
  contentReference: string;
  estimatedDuration: number;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  tags: string[];
  roleTargets: string[];
  modules: CourseModule[];
  publishedStatus: PublishedStatus;
}

export interface Policy {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  documentReference: string;
  tags: string[];
  applicableRoles: string[];
}

export interface KnowledgeDocument {
  id: string;
  tenantId: string;
  sourceSystem: "sharepoint" | "policy_library" | "course_material" | "m365";
  title: string;
  tags: string[];
  roleTargets: string[];
  documentUrl: string;
  contentReference: string;
  siteId?: string | null;
  driveId?: string | null;
  libraryId?: string | null;
  summary?: string | null;
  webUrl?: string | null;
  lastModifiedAt?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface LearningProgress {
  userId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  completionStatus: CompletionStatus;
  completionDate?: Date | null;
}

export interface KnowledgeIndexEntry {
  id: string;
  tenantId: string;
  sourceType: KnowledgeSourceType;
  sourceId: string;
  sourceSystem?: string;
  title: string;
  tags: string[];
  roleTargets: string[];
  summary: string;
  documentUrl?: string | null;
  contentReference?: string | null;
}

export interface CourseRecommendationResult {
  workflowId: "course_recommendation";
  resultType: "course_recommendation";
  userRole: string;
  recommendedCourses: Course[];
  requiredPolicies: Policy[];
  onboardingPath: string[];
  generatedAt: Date;
  warnings: string[];
}

export interface PolicyLookupResult {
  workflowId: "policy_lookup";
  resultType: "policy_lookup";
  query: string;
  matches: Policy[];
  generatedAt: Date;
  warnings: string[];
}

export interface SharePointDocumentLookupResult {
  workflowId: "sharepoint_document_lookup";
  resultType: "sharepoint_document_lookup";
  query: string;
  matches: KnowledgeDocument[];
  generatedAt: Date;
  warnings: string[];
}

export interface KnowledgeDocumentSummaryResult {
  workflowId: "knowledge_document_summary";
  resultType: "knowledge_document_summary";
  query: string;
  document: KnowledgeDocument | null;
  summary: string;
  keyPoints: string[];
  assumptionsMade: string[];
  generatedAt: Date;
  warnings: string[];
}

export interface LearningProgressResult {
  workflowId: "learning_progress";
  resultType: "learning_progress";
  userId: string;
  courseId: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  status: CompletionStatus;
  generatedAt: Date;
  warnings: string[];
}

export interface KnowledgeExplainResult {
  workflowId: "knowledge_explain";
  resultType: "knowledge_explain";
  query: string;
  matchedItems: KnowledgeIndexEntry[];
  explanation: string;
  assumptionsMade: string[];
  generatedAt: Date;
  warnings: string[];
}
