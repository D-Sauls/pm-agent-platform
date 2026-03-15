import type {
  EmployeeCourse,
  EmployeeOnboardingProgress,
  EmployeeOnboardingRecommendation,
  EmployeePolicy,
  EmployeeSession
} from "./types";

function cacheKey(scope: string, tenantId: string): string {
  return `pwa_cache:${tenantId}:${scope}`;
}

function readCache<T>(key: string): T | null {
  const raw = sessionStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

function writeCache<T>(key: string, value: T): void {
  sessionStorage.setItem(key, JSON.stringify(value));
}

function authHeaders(session: EmployeeSession): Headers {
  return new Headers({
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.userId}|${session.tenantId}|pm`,
    "x-tenant-id": session.tenantId
  });
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function fetchTenantContext(session: EmployeeSession) {
  const response = await fetch(`/api/tenants/${session.tenantId}/context`, {
    headers: authHeaders(session)
  });
  return parseJson<{
    tenant: { tenantId: string; organizationName: string };
    featureFlags: string[];
  }>(response);
}

export async function fetchCourses(session: EmployeeSession): Promise<EmployeeCourse[]> {
  const cached = readCache<EmployeeCourse[]>(cacheKey("courses", session.tenantId));
  if (cached) {
    return cached;
  }
  const response = await fetch(`/api/learning/courses?tenantId=${session.tenantId}`, {
    headers: authHeaders(session)
  });
  const body = await parseJson<{ courses: EmployeeCourse[] }>(response);
  writeCache(cacheKey("courses", session.tenantId), body.courses);
  return body.courses;
}

export async function fetchCourse(session: EmployeeSession, courseId: string): Promise<EmployeeCourse> {
  const cached = readCache<Record<string, EmployeeCourse>>(cacheKey("course-details", session.tenantId)) ?? {};
  if (cached[courseId]) {
    return cached[courseId];
  }
  const response = await fetch(`/api/learning/courses/${courseId}?tenantId=${session.tenantId}`, {
    headers: authHeaders(session)
  });
  const body = await parseJson<EmployeeCourse>(response);
  writeCache(cacheKey("course-details", session.tenantId), { ...cached, [courseId]: body });
  return body;
}

export async function fetchLesson(session: EmployeeSession, lessonId: string) {
  const response = await fetch(`/api/learning/lessons/${lessonId}?tenantId=${session.tenantId}`, {
    headers: authHeaders(session)
  });
  return parseJson<EmployeeCourse["modules"][number]["lessons"][number]>(response);
}

export async function fetchPolicies(session: EmployeeSession): Promise<EmployeePolicy[]> {
  const cached = readCache<EmployeePolicy[]>(cacheKey("policies", session.tenantId));
  if (cached) {
    return cached;
  }
  const response = await fetch(`/api/learning/policies?tenantId=${session.tenantId}&role=${encodeURIComponent(session.role)}`, {
    headers: authHeaders(session)
  });
  const body = await parseJson<{ policies: EmployeePolicy[] }>(response);
  writeCache(cacheKey("policies", session.tenantId), body.policies);
  return body.policies;
}

export async function fetchPolicyVersions(session: EmployeeSession, policyId: string) {
  const response = await fetch(`/api/policies/${policyId}/versions?tenantId=${session.tenantId}`, {
    headers: authHeaders(session)
  });
  return parseJson<{ versions: Array<{ id: string; versionLabel: string; changeSummary?: string | null }> }>(response);
}

export async function fetchCourseVersions(session: EmployeeSession, courseId: string) {
  const response = await fetch(`/api/courses/${courseId}/versions?tenantId=${session.tenantId}`, {
    headers: authHeaders(session)
  });
  return parseJson<{ versions: Array<{ id: string; versionLabel: string; changeSummary?: string | null }> }>(response);
}

export async function fetchProgress(session: EmployeeSession, courseId: string) {
  const response = await fetch(
    `/api/learning/progress?tenantId=${session.tenantId}&userId=${session.userId}&courseId=${courseId}`,
    { headers: authHeaders(session) }
  );
  return parseJson<{
    userId: string;
    courseId: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
    status: string;
  }>(response);
}

export async function postProgress(
  session: EmployeeSession,
  payload: { courseId: string; moduleId: string; lessonId: string; completionStatus: string }
) {
  const response = await fetch("/api/learning/progress", {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify({
      tenantId: session.tenantId,
      userId: session.userId,
      ...payload
    })
  });
  return parseJson(response);
}

export async function fetchComplianceStatus(session: EmployeeSession) {
  const response = await fetch(
    `/api/compliance/status?tenantId=${session.tenantId}&userId=${session.userId}&role=${encodeURIComponent(session.role)}&department=${encodeURIComponent(session.department ?? "")}`,
    { headers: authHeaders(session) }
  );
  return parseJson<{ statuses: Array<{ requirementId: string; status: string; dueDate?: string | null }> }>(response);
}

export async function fetchMyAcknowledgements(session: EmployeeSession) {
  const response = await fetch(
    `/api/compliance/my-acknowledgements?tenantId=${session.tenantId}&userId=${session.userId}`,
    { headers: authHeaders(session) }
  );
  return parseJson<{ acknowledgements: Array<any> }>(response);
}

export async function createAcknowledgement(
  session: EmployeeSession,
  payload: { subjectType: string; subjectId: string; subjectVersionId?: string | null; acknowledgementType: string }
) {
  const response = await fetch("/api/compliance/acknowledgements", {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify({
      tenantId: session.tenantId,
      id: `ack-${Date.now()}`,
      userId: session.userId,
      subjectType: payload.subjectType,
      subjectId: payload.subjectId,
      subjectVersionId: payload.subjectVersionId ?? null,
      acknowledgementType: payload.acknowledgementType,
      status: "completed",
      actorId: session.userId,
      actorRole: session.role
    })
  });
  return parseJson(response);
}

export async function fetchComplianceConfig(session: EmployeeSession) {
  const response = await fetch(`/api/compliance/config?tenantId=${session.tenantId}`, {
    headers: authHeaders(session)
  });
  return parseJson<{ config: { downloadPolicy: string } }>(response);
}

export async function fetchOnboardingRecommendation(session: EmployeeSession): Promise<EmployeeOnboardingRecommendation> {
  const response = await fetch(
    `/api/onboarding/path?tenantId=${session.tenantId}&role=${encodeURIComponent(session.role)}&department=${encodeURIComponent(session.department ?? "")}&userId=${session.userId}`,
    { headers: authHeaders(session) }
  );
  return parseJson<EmployeeOnboardingRecommendation>(response);
}

export async function fetchOnboardingProgress(session: EmployeeSession): Promise<EmployeeOnboardingProgress> {
  const response = await fetch(
    `/api/onboarding/progress?tenantId=${session.tenantId}&role=${encodeURIComponent(session.role)}&department=${encodeURIComponent(session.department ?? "")}&userId=${session.userId}`,
    { headers: authHeaders(session) }
  );
  return parseJson<EmployeeOnboardingProgress>(response);
}

export async function askAssistant(session: EmployeeSession, message: string) {
  const response = await fetch("/api/agent/goal-execute", {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify({
      tenantId: session.tenantId,
      projectId: "project-alpha",
      message,
      metadata: {
        role: session.role,
        department: session.department,
        userId: session.userId
      }
    })
  });
  return parseJson<{
    response: {
      synthesizedSummary: string;
      keyFindings: string[];
      recommendedActions: string[];
      warnings: string[];
      workflowsExecuted: string[];
    };
  }>(response);
}
