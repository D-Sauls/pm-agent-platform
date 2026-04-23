import { useEffect, useMemo, useState } from "react";
import { postEmployeeJson } from "../api/employeeTransport";
import { defaultAssistantDemoResponse, getAssistantDemoResult } from "../assistantDemoData";
import {
  clearEmployeeSession,
  loadEmployeeSession,
  saveEmployeeSession,
  toEmployeeSessionAccess
} from "../session/employeeSession";
import {
  activateEmployee,
  askAssistant,
  createAcknowledgement,
  fetchComplianceConfig,
  fetchComplianceStatus,
  fetchCourse,
  fetchCourses,
  fetchLesson,
  fetchMyAcknowledgements,
  fetchOnboardingProgress,
  fetchOnboardingRecommendation,
  fetchPolicies,
  fetchPolicyVersions,
  fetchProgress,
  fetchTenantContext,
  loginEmployee,
  postProgress
} from "./api";
import {
  clearManagedDownloads,
  clearQueuedProgress,
  flushProgressQueue,
  invalidateUrlsForOffline,
  queueProgressSync
} from "./offline";
import { resolveTenantBranding } from "./branding";
import { loadDownloads, loadProgressQueue } from "./storage";
import { resolveTenantRuntime } from "./runtime";
import type {
  AcknowledgementSummary,
  ComplianceStatusItem,
  CourseProgressSummary,
  DownloadRecord,
  EmployeeCourse,
  EmployeeOnboardingProgress,
  EmployeeOnboardingRecommendation,
  EmployeePolicy,
  EmployeeSession,
  PolicyVersionSummary
} from "./types";
import {
  buildOfflineManifest,
  filterAssignedCourses,
  filterAssignedPolicies,
  formatDisplayName,
  readActivationToken,
  resolveCourseStatus,
  resolvePendingItems,
  resolvePolicyStatus,
  syncAssignedDownloads,
  uniq,
  useOnlineStatus
} from "./workspaceHelpers";

export type AssistantResponse = {
  synthesizedSummary: string;
  keyFindings: string[];
  recommendedActions: string[];
  warnings: string[];
  workflowsExecuted: string[];
};

export type EmployeeWorkspaceError = {
  message: string;
  retryLabel?: string;
};

export type AuthMode = "login" | "activate";

function buildEmployeeSession(result: {
  user: {
    id: string;
    tenantId: string;
    username: string;
    firstName: string;
    lastName: string;
    roleName?: string | null;
    department?: string | null;
  };
  sessionToken: string;
}): EmployeeSession {
  return {
    userId: result.user.id,
    tenantId: result.user.tenantId,
    username: result.user.username,
    displayName: formatDisplayName(result.user),
    role: result.user.roleName ?? "Employee",
    department: result.user.department ?? undefined,
    sessionToken: result.sessionToken
  };
}

function fallbackOnboardingSnapshot(
  recommendation: EmployeeOnboardingRecommendation | null,
  progress: EmployeeOnboardingProgress | null
): EmployeeOnboardingProgress | null {
  if (!recommendation || !progress) {
    return null;
  }
  return {
    recommendation,
    progress: progress.progress,
    nextStep: progress.nextStep
  };
}

function normalizeQueuedPath(path: string): string {
  return path.startsWith("/api/") ? path.slice(4) : path;
}

export function useEmployeeWorkspace() {
  const [runtime] = useState(() => resolveTenantRuntime());
  const storageScope = runtime.tenantId;
  const [authMode, setAuthMode] = useState<AuthMode>(() => (readActivationToken() ? "activate" : "login"));
  const [activationToken, setActivationToken] = useState(() => readActivationToken());
  const [session, setSession] = useState<EmployeeSession | null>(() => loadEmployeeSession());
  const [branding, setBranding] = useState(() => resolveTenantBranding(runtime.tenantId));
  const [courses, setCourses] = useState<EmployeeCourse[]>([]);
  const [policies, setPolicies] = useState<EmployeePolicy[]>([]);
  const [courseDetail, setCourseDetail] = useState<EmployeeCourse | null>(null);
  const [lesson, setLesson] = useState<EmployeeCourse["modules"][number]["lessons"][number] | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, CourseProgressSummary>>({});
  const [policyVersions, setPolicyVersions] = useState<Record<string, PolicyVersionSummary[]>>({});
  const [acknowledgements, setAcknowledgements] = useState<AcknowledgementSummary[]>([]);
  const [compliance, setCompliance] = useState<ComplianceStatusItem[]>([]);
  const [onboardingRecommendation, setOnboardingRecommendation] =
    useState<EmployeeOnboardingRecommendation | null>(null);
  const [onboardingProgress, setOnboardingProgress] = useState<EmployeeOnboardingProgress | null>(null);
  const [downloadPolicy, setDownloadPolicy] = useState("authenticated_only");
  const [downloads, setDownloads] = useState<DownloadRecord[]>(() => loadDownloads(storageScope));
  const [queuedChangesCount, setQueuedChangesCount] = useState(() => loadProgressQueue(storageScope).length);
  const [assistantReply, setAssistantReply] = useState<AssistantResponse | null>(defaultAssistantDemoResponse);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<EmployeeWorkspaceError | null>(null);
  const online = useOnlineStatus();

  const assignedCourses = useMemo(
    () => filterAssignedCourses(courses, onboardingRecommendation, session?.role ?? ""),
    [courses, onboardingRecommendation, session?.role]
  );
  const assignedPolicies = useMemo(
    () => filterAssignedPolicies(policies, onboardingRecommendation, session?.role ?? ""),
    [policies, onboardingRecommendation, session?.role]
  );

  const selectedCourse = useMemo(
    () => courseDetail ?? assignedCourses.find((course) => course.id === selectedCourseId) ?? assignedCourses[0] ?? null,
    [assignedCourses, courseDetail, selectedCourseId]
  );
  const selectedPolicy = useMemo(
    () => assignedPolicies.find((policy) => policy.id === selectedPolicyId) ?? assignedPolicies[0] ?? null,
    [assignedPolicies, selectedPolicyId]
  );
  const selectedPolicyVersions = selectedPolicy ? policyVersions[selectedPolicy.id] ?? [] : [];
  const currentPolicyVersion = selectedPolicyVersions[0] ?? null;
  const policyVersionLabels = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(policyVersions).map(([policyId, versions]) => [policyId, versions[0]?.versionLabel ?? "Current version"])
      ),
    [policyVersions]
  );
  const completionPercent =
    onboardingProgress?.nextStep?.completionPercentage ?? onboardingProgress?.progress?.completionPercentage ?? 0;
  const overdueCount = compliance.filter((item) => item.status === "overdue").length;
  const pendingItems = useMemo(
    () => resolvePendingItems(assignedCourses, assignedPolicies, progress, acknowledgements, onboardingProgress, overdueCount),
    [acknowledgements, assignedCourses, assignedPolicies, onboardingProgress, overdueCount, progress]
  );
  const nextCourse = useMemo(() => {
    const targetId = onboardingProgress?.nextStep?.nextCourseId;
    if (targetId) {
      return assignedCourses.find((course) => course.id === targetId) ?? null;
    }
    return assignedCourses.find((course) => resolveCourseStatus(course, progress, compliance) !== "completed") ?? null;
  }, [assignedCourses, compliance, onboardingProgress?.nextStep?.nextCourseId, progress]);
  const nextPolicy = useMemo(() => {
    const targetId = onboardingProgress?.nextStep?.nextPolicyId;
    if (targetId) {
      return assignedPolicies.find((policy) => policy.id === targetId) ?? null;
    }
    return assignedPolicies.find((policy) => resolvePolicyStatus(policy, acknowledgements, compliance) !== "completed") ?? null;
  }, [acknowledgements, assignedPolicies, compliance, onboardingProgress?.nextStep?.nextPolicyId]);
  const nextStepTitle = nextCourse
    ? `Continue ${nextCourse.title}`
    : nextPolicy
      ? `Review ${nextPolicy.title}`
      : "Continue your onboarding";
  const nextStepDescription =
    onboardingProgress?.nextStep?.recommendation ??
    onboardingRecommendation?.nextActions?.[0] ??
    "Open your assigned training to continue your onboarding path.";
  const readyDownloads = downloads.filter((item) => item.status === "ready").length;
  const pendingDownloads = downloads.filter((item) => item.status === "pending_sync").length;
  const assistantPrompts = useMemo(
    () =>
      uniq([
        "What should I do next?",
        "Do I need to complete every course?",
        "What am I missing for compliance?",
        nextCourse ? `Summarize ${nextCourse.title}` : "Summarize my onboarding path",
        nextPolicy ? `Explain ${nextPolicy.title}` : "Explain my assigned policy"
      ]),
    [nextCourse, nextPolicy]
  );

  useEffect(() => {
    if (!session) {
      return;
    }
    void loadWorkspace(session);
  }, [session]);

  useEffect(() => {
    if (!session || !online) {
      return;
    }

    void flushProgressQueue(
      (path, payload) => postEmployeeJson(normalizeQueuedPath(path), toEmployeeSessionAccess(session), payload).then(() => undefined),
      storageScope
    ).then(() => {
      setQueuedChangesCount(loadProgressQueue(storageScope).length);
      void loadWorkspace(session);
    });
  }, [online, session, storageScope]);

  async function loadWorkspace(currentSession: EmployeeSession) {
    try {
      setLoading(true);
      setError(null);

      const [tenantContext, courseList, policyList, complianceStatus, acknowledgementResult, config, onboarding, onboardingState] = await Promise.all([
        fetchTenantContext(currentSession),
        fetchCourses(currentSession),
        fetchPolicies(currentSession),
        fetchComplianceStatus(currentSession),
        fetchMyAcknowledgements(currentSession),
        fetchComplianceConfig(currentSession),
        fetchOnboardingRecommendation(currentSession),
        fetchOnboardingProgress(currentSession)
      ]);

      setBranding(resolveTenantBranding(currentSession.tenantId, tenantContext.tenant.organizationName));
      setCourses(courseList);
      setPolicies(policyList);
      setCompliance(complianceStatus.statuses);
      setAcknowledgements(acknowledgementResult.acknowledgements);
      setDownloadPolicy(config.config.downloadPolicy);
      setOnboardingRecommendation(onboarding);
      setOnboardingProgress(onboardingState);

      const nextAssignedCourses = filterAssignedCourses(courseList, onboarding, currentSession.role);
      const nextAssignedPolicies = filterAssignedPolicies(policyList, onboarding, currentSession.role);
      const progressEntries = await Promise.all(
        nextAssignedCourses.map(async (course) => [course.id, await fetchProgress(currentSession, course.id)] as const)
      );
      setProgress(Object.fromEntries(progressEntries));

      if (!selectedCourseId && nextAssignedCourses[0]) {
        setSelectedCourseId(nextAssignedCourses[0].id);
      }
      if (!selectedPolicyId && nextAssignedPolicies[0]) {
        setSelectedPolicyId(nextAssignedPolicies[0].id);
      }

      if (online) {
        const versionEntries = await Promise.all(
          nextAssignedPolicies.map(async (policy) => {
            const result = await fetchPolicyVersions(currentSession, policy.id).catch(() => ({ versions: [] as PolicyVersionSummary[] }));
            return [policy.id, result.versions] as const;
          })
        );
        const nextPolicyVersions = Object.fromEntries(versionEntries);
        setPolicyVersions(nextPolicyVersions);
        const syncedDownloads = await syncAssignedDownloads(
          buildOfflineManifest(
            nextAssignedCourses,
            nextAssignedPolicies,
            nextPolicyVersions,
            config.config.downloadPolicy,
            true
          ),
          true,
          storageScope
        );
        setDownloads(syncedDownloads);
      } else {
        setDownloads(loadDownloads(storageScope));
      }

      setQueuedChangesCount(loadProgressQueue(storageScope).length);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to load your workspace right now.";
      setError({
        message: online
          ? message
          : "You are offline. Previously downloaded training stays available, and saved progress will sync when you reconnect.",
        retryLabel: "Retry"
      });
      setDownloads(loadDownloads(storageScope));
      setQueuedChangesCount(loadProgressQueue(storageScope).length);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(input: { username: string; password: string }) {
    try {
      setAuthLoading(true);
      setError(null);
      const nextSession = buildEmployeeSession(await loginEmployee(input.username, input.password));
      saveEmployeeSession(nextSession);
      setSession(nextSession);
    } catch (caught) {
      setError({ message: caught instanceof Error ? caught.message : "Unable to sign in." });
    } finally {
      setAuthLoading(false);
    }
  }

  async function activateAccount(input: { token: string; password: string }) {
    try {
      setAuthLoading(true);
      setError(null);
      const nextSession = buildEmployeeSession(await activateEmployee(input.token, input.password));
      saveEmployeeSession(nextSession);
      setSession(nextSession);
      setActivationToken("");
      setAuthMode("login");
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (caught) {
      setError({ message: caught instanceof Error ? caught.message : "Unable to activate your account." });
    } finally {
      setAuthLoading(false);
    }
  }

  async function openCourse(courseId: string) {
    if (!session) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const detail = await fetchCourse(session, courseId);
      setCourseDetail(detail);
      setSelectedCourseId(courseId);
      setLesson(null);
    } catch (caught) {
      setError({ message: caught instanceof Error ? caught.message : "Unable to open this course." });
    } finally {
      setLoading(false);
    }
  }

  async function openLesson(courseId: string, lessonId: string) {
    if (!session) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const detail = courseDetail?.id === courseId ? courseDetail : await fetchCourse(session, courseId);
      const lessonDetail = await fetchLesson(session, lessonId);
      setCourseDetail(detail);
      setSelectedCourseId(courseId);
      setLesson(lessonDetail);
    } catch (caught) {
      setError({ message: caught instanceof Error ? caught.message : "Unable to open this lesson." });
    } finally {
      setLoading(false);
    }
  }

  async function openPolicy(policyId: string) {
    if (!session) {
      return;
    }
    setSelectedPolicyId(policyId);
    if (policyVersions[policyId]?.length) {
      return;
    }
    try {
      const result = await fetchPolicyVersions(session, policyId);
      setPolicyVersions((current) => ({ ...current, [policyId]: result.versions }));
    } catch {
      // Ignore version fetch failure and allow the policy detail to render with fallback text.
    }
  }

  async function completeLesson() {
    if (!session || !selectedCourse || !lesson) {
      return;
    }

    const module = selectedCourse.modules.find((entry) => entry.lessons.some((candidate) => candidate.id === lesson.id));
    if (!module) {
      return;
    }

    const payload = {
      courseId: selectedCourse.id,
      moduleId: module.id,
      lessonId: lesson.id,
      completionStatus: "completed"
    };

    try {
      setError(null);
      if (online) {
        await postProgress(session, payload);
      } else {
        queueProgressSync(
          {
            id: `queued-${Date.now()}`,
            path: "/learning/progress",
            payload,
            createdAt: new Date().toISOString()
          },
          storageScope
        );
        setQueuedChangesCount(loadProgressQueue(storageScope).length);
      }

      const totalLessons =
        progress[selectedCourse.id]?.totalLessons ??
        selectedCourse.modules.reduce((count, entry) => count + entry.lessons.length, 0);
      const completedLessons = Math.min(
        totalLessons,
        Math.max(1, (progress[selectedCourse.id]?.completedLessons ?? 0) + 1)
      );
      const localProgress: CourseProgressSummary = {
        userId: session.userId,
        courseId: selectedCourse.id,
        progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 100,
        completedLessons,
        totalLessons,
        status: completedLessons >= totalLessons ? "completed" : "in_progress"
      };

      const nextProgress = online
        ? await fetchProgress(session, selectedCourse.id).catch(() => localProgress)
        : localProgress;
      setProgress((current) => ({ ...current, [selectedCourse.id]: nextProgress }));
      if (online) {
        const nextOnboarding = await fetchOnboardingProgress(session).catch(() => onboardingProgress);
        setOnboardingProgress(nextOnboarding ?? null);
      }

      setAssistantReply({
        synthesizedSummary: online ? "Lesson progress saved." : "Lesson progress saved offline and queued for sync.",
        keyFindings: [lesson.title],
        recommendedActions: ["Continue to the next assigned step when ready."],
        warnings: online ? [] : ["This completion will sync automatically when you reconnect."],
        workflowsExecuted: ["learning_progress"]
      });
    } catch (caught) {
      setError({ message: caught instanceof Error ? caught.message : "Unable to update progress." });
    }
  }

  async function acknowledgePolicy(policyId: string) {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createAcknowledgement(session, {
        subjectType: "policy",
        subjectId: policyId,
        acknowledgementType: "accepted"
      });

      const [nextAcknowledgements, nextCompliance, nextOnboarding] = await Promise.all([
        fetchMyAcknowledgements(session),
        fetchComplianceStatus(session),
        fetchOnboardingProgress(session).catch(() => fallbackOnboardingSnapshot(onboardingRecommendation, onboardingProgress))
      ]);

      setAcknowledgements(nextAcknowledgements.acknowledgements);
      setCompliance(nextCompliance.statuses);
      if (nextOnboarding && typeof nextOnboarding === "object") {
        setOnboardingProgress(nextOnboarding as EmployeeOnboardingProgress);
      }
    } catch (caught) {
      setError({ message: caught instanceof Error ? caught.message : "Unable to save your acknowledgement." });
    } finally {
      setLoading(false);
    }
  }

  async function submitAssistantPrompt(message: string) {
    if (!session || !message.trim()) {
      return;
    }

    const trimmedMessage = message.trim();
    try {
      setAssistantLoading(true);
      setError(null);
      const reply = await askAssistant(session, trimmedMessage);
      setAssistantReply(reply.response);
    } catch (caught) {
      const fallback = getAssistantDemoResult(trimmedMessage, true).response;
      const failureMessage = caught instanceof Error ? caught.message : undefined;
      setAssistantReply({
        ...fallback,
        warnings: failureMessage ? [`${failureMessage}. Showing guided fallback response.`] : fallback.warnings
      });
    } finally {
      setAssistantLoading(false);
    }
  }

  async function signOut() {
    const cachedUrls = loadDownloads(storageScope).flatMap((item) => item.urls);
    await invalidateUrlsForOffline(cachedUrls);
    clearManagedDownloads(storageScope);
    clearQueuedProgress(storageScope);
    clearEmployeeSession();
    setSession(null);
    setCourses([]);
    setPolicies([]);
    setCourseDetail(null);
    setLesson(null);
    setSelectedCourseId(null);
    setSelectedPolicyId(null);
    setProgress({});
    setPolicyVersions({});
    setAcknowledgements([]);
    setCompliance([]);
    setOnboardingRecommendation(null);
    setOnboardingProgress(null);
    setDownloads([]);
    setQueuedChangesCount(0);
    setAssistantReply(defaultAssistantDemoResponse);
    setError(null);
  }

  return {
    runtime,
    authMode,
    setAuthMode,
    activationToken,
    setActivationToken,
    session,
    branding,
    loading,
    authLoading,
    online,
    error,
    assistantReply,
    assistantLoading,
    assistantPrompts,
    assignedCourses,
    assignedPolicies,
    progress,
    selectedCourse,
    selectedPolicy,
    selectedPolicyVersions,
    currentPolicyVersion,
    policyVersionLabels,
    lesson,
    downloads,
    readyDownloads,
    pendingDownloads,
    queuedChangesCount,
    completionPercent,
    pendingItems,
    nextStepTitle,
    nextStepDescription,
    overdueCount,
    downloadPolicy,
    signIn,
    activateAccount,
    signOut,
    openCourse,
    openLesson,
    openPolicy,
    completeLesson,
    acknowledgePolicy,
    submitAssistantPrompt,
    setLesson,
    setCourseDetail,
    resolveCourseStatus: (course: EmployeeCourse) => resolveCourseStatus(course, progress, compliance),
    resolvePolicyStatus: (policy: EmployeePolicy) => resolvePolicyStatus(policy, acknowledgements, compliance),
    retry: () => (session ? loadWorkspace(session) : Promise.resolve())
  };
}
