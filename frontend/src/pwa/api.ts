import {
  fetchAnonymousJson,
  fetchEmployeeJson,
  postEmployeeJson,
  type EmployeeApiSession
} from "../api/employeeTransport";
import { resolveTenantRuntime } from "./runtime";
import type {
  AcknowledgementSummary,
  ComplianceStatusItem,
  CourseProgressSummary,
  EmployeeCourse,
  EmployeeOnboardingProgress,
  EmployeeOnboardingRecommendation,
  EmployeePolicy,
  EmployeeSession,
  PolicyVersionSummary
} from "./types";

function cacheKey(scope: string, session: Pick<EmployeeSession, "tenantId" | "userId">): string {
  return `pwa_cache:${session.tenantId}:${session.userId}:${scope}`;
}

function readCache<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

function writeCache<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function sessionAccess(session: EmployeeSession): EmployeeApiSession {
  return {
    tenantId: session.tenantId,
    sessionToken: session.sessionToken
  };
}

function runtimeTenantId(): string {
  return resolveTenantRuntime().tenantId;
}

export async function loginEmployee(username: string, password: string) {
  const tenantId = runtimeTenantId();
  return fetchAnonymousJson<{
    user: {
      id: string;
      tenantId: string;
      username: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
      roleName?: string | null;
      department?: string | null;
    };
    sessionToken: string;
  }>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId
    },
    body: JSON.stringify({ username, password })
  });
}

export async function activateEmployee(token: string, password: string) {
  const tenantId = runtimeTenantId();
  return fetchAnonymousJson<{
    user: {
      id: string;
      tenantId: string;
      username: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
      roleName?: string | null;
      department?: string | null;
    };
    sessionToken: string;
  }>("/auth/activate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId
    },
    body: JSON.stringify({ token, password, tenantId })
  });
}

export async function fetchTenantContext(session: EmployeeSession) {
  return fetchEmployeeJson<{
    tenant: { tenantId: string; organizationName: string };
    featureFlags: string[];
  }>(`/tenants/${session.tenantId}/context`, sessionAccess(session));
}

export async function fetchCourses(session: EmployeeSession): Promise<EmployeeCourse[]> {
  const key = cacheKey("courses", session);
  const cached = readCache<EmployeeCourse[]>(key);
  if (cached) {
    return cached;
  }

  const body = await fetchEmployeeJson<{ courses: EmployeeCourse[] }>(
    "/learning/courses?publishedOnly=true",
    sessionAccess(session)
  );
  writeCache(key, body.courses);
  return body.courses;
}

export async function fetchCourse(session: EmployeeSession, courseId: string): Promise<EmployeeCourse> {
  const key = cacheKey(`course:${courseId}`, session);
  const cached = readCache<EmployeeCourse>(key);
  if (cached) {
    return cached;
  }

  const body = await fetchEmployeeJson<EmployeeCourse>(`/learning/courses/${courseId}`, sessionAccess(session));
  writeCache(key, body);
  return body;
}

export async function fetchLesson(session: EmployeeSession, lessonId: string) {
  return fetchEmployeeJson<EmployeeCourse["modules"][number]["lessons"][number]>(
    `/learning/lessons/${lessonId}`,
    sessionAccess(session)
  );
}

export async function fetchPolicies(session: EmployeeSession): Promise<EmployeePolicy[]> {
  const key = cacheKey("policies", session);
  const cached = readCache<EmployeePolicy[]>(key);
  if (cached) {
    return cached;
  }

  const body = await fetchEmployeeJson<{ policies: EmployeePolicy[] }>(
    "/learning/policies",
    sessionAccess(session)
  );
  writeCache(key, body.policies);
  return body.policies;
}

export async function fetchPolicyVersions(session: EmployeeSession, policyId: string) {
  return fetchEmployeeJson<{ versions: PolicyVersionSummary[] }>(
    `/policies/${policyId}/versions`,
    sessionAccess(session)
  );
}

export async function fetchProgress(session: EmployeeSession, courseId: string) {
  return fetchEmployeeJson<CourseProgressSummary>(
    `/learning/progress?courseId=${encodeURIComponent(courseId)}`,
    sessionAccess(session)
  );
}

export async function postProgress(
  session: EmployeeSession,
  payload: { courseId: string; moduleId: string; lessonId: string; completionStatus: string }
) {
  return postEmployeeJson("/learning/progress", sessionAccess(session), payload);
}

export async function fetchComplianceStatus(session: EmployeeSession) {
  return fetchEmployeeJson<{ statuses: ComplianceStatusItem[] }>("/compliance/status", sessionAccess(session));
}

export async function fetchMyAcknowledgements(session: EmployeeSession) {
  return fetchEmployeeJson<{ acknowledgements: AcknowledgementSummary[] }>(
    "/compliance/my-acknowledgements",
    sessionAccess(session)
  );
}

export async function createAcknowledgement(
  session: EmployeeSession,
  payload: { subjectType: string; subjectId: string; acknowledgementType: string }
) {
  return postEmployeeJson("/compliance/acknowledgements", sessionAccess(session), {
    tenantId: session.tenantId,
    subjectType: payload.subjectType,
    subjectId: payload.subjectId,
    acknowledgementType: payload.acknowledgementType
  });
}

export async function fetchComplianceConfig(session: EmployeeSession) {
  return fetchEmployeeJson<{ config: { downloadPolicy: string } }>("/compliance/config", sessionAccess(session));
}

export async function fetchOnboardingRecommendation(session: EmployeeSession): Promise<EmployeeOnboardingRecommendation> {
  return fetchEmployeeJson<EmployeeOnboardingRecommendation>("/onboarding/path", sessionAccess(session));
}

export async function fetchOnboardingProgress(session: EmployeeSession): Promise<EmployeeOnboardingProgress> {
  return fetchEmployeeJson<EmployeeOnboardingProgress>("/onboarding/progress", sessionAccess(session));
}

export async function askAssistant(session: EmployeeSession, message: string) {
  return postEmployeeJson<{
    response: {
      synthesizedSummary: string;
      keyFindings: string[];
      recommendedActions: string[];
      warnings: string[];
      workflowsExecuted: string[];
    };
  }>("/agent/goal-execute", sessionAccess(session), { message });
}
