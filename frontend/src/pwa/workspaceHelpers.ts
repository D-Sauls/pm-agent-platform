import { useEffect, useState } from "react";
import { buildApiUrl } from "./runtime";
import {
  cacheUrlsForOffline,
  canDownloadByPolicy,
  invalidateUrlsForOffline,
  replaceManagedDownloads
} from "./offline";
import { loadDownloads } from "./storage";
import type {
  AcknowledgementSummary,
  ComplianceStatusItem,
  CourseProgressSummary,
  DownloadRecord,
  EmployeeCourse,
  EmployeeOnboardingProgress,
  EmployeeOnboardingRecommendation,
  EmployeePolicy,
  PolicyVersionSummary
} from "./types";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return online;
}

export function readActivationToken(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("activationToken") ?? params.get("token") ?? "";
}

export function formatDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.username || "Employee";
}

export function filterAssignedCourses(
  courses: EmployeeCourse[],
  recommendation: EmployeeOnboardingRecommendation | null,
  role: string
): EmployeeCourse[] {
  const recommendedIds = new Set(recommendation?.recommendedCourses.map((course) => course.id) ?? []);
  return courses.filter((course) => {
    if (recommendedIds.size > 0) {
      return recommendedIds.has(course.id);
    }
    return course.roleTargets.length === 0 || course.roleTargets.includes(role);
  });
}

export function filterAssignedPolicies(
  policies: EmployeePolicy[],
  recommendation: EmployeeOnboardingRecommendation | null,
  role: string
): EmployeePolicy[] {
  const requiredIds = new Set(recommendation?.requiredPolicies.map((policy) => policy.id) ?? []);
  return policies.filter((policy) => {
    if (requiredIds.size > 0) {
      return requiredIds.has(policy.id);
    }
    return policy.applicableRoles.length === 0 || policy.applicableRoles.includes(role);
  });
}

function courseFingerprint(course: EmployeeCourse): string {
  return course.modules
    .flatMap((module) => module.lessons.map((lesson) => `${lesson.id}:${lesson.contentReference}`))
    .join("|");
}

function policyFingerprint(policy: EmployeePolicy, versionLabel?: string): string {
  return `${versionLabel ?? "current"}:${policy.documentReference}`;
}

export function buildOfflineManifest(
  courses: EmployeeCourse[],
  policies: EmployeePolicy[],
  policyVersions: Record<string, PolicyVersionSummary[]>,
  downloadPolicy: string,
  online: boolean
): DownloadRecord[] {
  const permission = canDownloadByPolicy(downloadPolicy);
  const courseRecords: DownloadRecord[] = courses.map((course) => ({
    id: `course:${course.id}`,
    kind: "course",
    title: course.title,
    urls: course.modules.flatMap((module) =>
      module.lessons.map((lesson) => lesson.contentReference).filter((reference) => reference.startsWith("/"))
    ),
    downloadedAt: new Date().toISOString(),
    status: permission.allowed ? (online ? "ready" : "pending_sync") : "blocked",
    versionKey: courseFingerprint(course),
    reason: permission.allowed ? undefined : permission.reason
  }));

  const policyRecords: DownloadRecord[] = policies.map((policy) => ({
    id: `policy:${policy.id}`,
    kind: "policy",
    title: policy.title,
    urls: policy.documentReference.startsWith("/") ? [policy.documentReference] : [],
    downloadedAt: new Date().toISOString(),
    status: permission.allowed ? (online ? "ready" : "pending_sync") : "blocked",
    versionKey: policyFingerprint(policy, policyVersions[policy.id]?.[0]?.versionLabel),
    reason: permission.allowed ? undefined : permission.reason
  }));

  return [...courseRecords, ...policyRecords];
}

export async function syncAssignedDownloads(
  records: DownloadRecord[],
  online: boolean,
  scope: string
): Promise<DownloadRecord[]> {
  const existing = loadDownloads(scope);
  const nextRecords: DownloadRecord[] = [];

  for (const record of records) {
    const previous = existing.find((entry) => entry.id === record.id);
    if (previous?.versionKey && previous.versionKey !== record.versionKey && previous.urls.length > 0) {
      await invalidateUrlsForOffline(previous.urls);
    }

    if (record.status !== "blocked" && online && record.urls.length > 0) {
      await cacheUrlsForOffline(record.urls);
      nextRecords.push({ ...record, status: "ready", downloadedAt: new Date().toISOString() });
      continue;
    }

    if (record.status !== "blocked" && !online) {
      nextRecords.push({ ...record, status: "pending_sync" });
      continue;
    }

    nextRecords.push(record);
  }

  replaceManagedDownloads(nextRecords, scope);
  return nextRecords;
}

export function resolvePendingItems(
  courses: EmployeeCourse[],
  policies: EmployeePolicy[],
  progress: Record<string, CourseProgressSummary>,
  acknowledgements: AcknowledgementSummary[],
  onboardingProgress: EmployeeOnboardingProgress | null,
  overdueCount: number
): string[] {
  const courseById = new Map(courses.map((course) => [course.id, course.title]));
  const policyById = new Map(policies.map((policy) => [policy.id, policy.title]));

  const onboardingItems = onboardingProgress?.progress?.remainingItems
    ?.map((item) => courseById.get(item) ?? policyById.get(item) ?? null)
    .filter(Boolean) as string[] | undefined;

  if (onboardingItems && onboardingItems.length > 0) {
    return onboardingItems.slice(0, 4);
  }

  const incompleteCourses = courses
    .filter((course) => (progress[course.id]?.status ?? "not_started") !== "completed")
    .map((course) => course.title);

  const pendingPolicies = policies
    .filter((policy) => !acknowledgements.some((entry) => entry.subjectId === policy.id))
    .map((policy) => policy.title);

  const items = [...incompleteCourses, ...pendingPolicies];
  if (overdueCount > 0) {
    items.unshift(`${overdueCount} overdue item${overdueCount === 1 ? "" : "s"}`);
  }
  return items.slice(0, 4);
}

export function resolveCourseStatus(
  course: EmployeeCourse,
  progress: Record<string, CourseProgressSummary>,
  compliance: ComplianceStatusItem[]
): "completed" | "pending" | "overdue" {
  const summary = progress[course.id];
  if (summary?.status === "completed") {
    return "completed";
  }
  const overdue = compliance.some((item) => item.status === "overdue" && item.requirementId.includes(course.id));
  return overdue ? "overdue" : "pending";
}

export function resolvePolicyStatus(
  policy: EmployeePolicy,
  acknowledgements: AcknowledgementSummary[],
  compliance: ComplianceStatusItem[]
): "completed" | "pending" | "overdue" {
  if (acknowledgements.some((entry) => entry.subjectId === policy.id)) {
    return "completed";
  }
  const overdue = compliance.some((item) => item.status === "overdue" && item.requirementId.includes(policy.id));
  return overdue ? "overdue" : "pending";
}

export function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildQueuedProgressPath(basePath: string): string {
  return buildApiUrl(basePath, "/learning/progress");
}
