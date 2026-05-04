import { useEffect, useMemo, useState } from "react";
import {
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
  fetchTenantContext
} from "./api";
import { resolveTenantBranding } from "./branding";
import { loadDownloads, loadProgressQueue } from "./storage";
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
  PolicyVersionSummary,
  TenantBranding
} from "./types";
import {
  buildOfflineManifest,
  filterAssignedCourses,
  filterAssignedPolicies,
  resolveCourseStatus,
  resolvePendingItems,
  resolvePolicyStatus,
  syncAssignedDownloads,
  uniq,
  useOnlineStatus
} from "./workspaceHelpers";
import type { EmployeeWorkspaceError } from "./workspaceTypes";
import type { TenantRuntime } from "./runtime";

export function useEmployeeWorkspaceData(input: {
  session: EmployeeSession | null;
  runtime: TenantRuntime;
}) {
  const { session, runtime } = input;
  const storageScope = session?.tenantId ?? runtime.tenantId;
  const online = useOnlineStatus();
  const [branding, setBranding] = useState<TenantBranding>(() => resolveTenantBranding(runtime.tenantId));
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<EmployeeWorkspaceError | null>(null);

  const assignedCourses = useMemo(
    () => filterAssignedCourses(courses, onboardingRecommendation, session?.role ?? ""),
    [courses, onboardingRecommendation, session?.role]
  );
  const assignedPolicies = useMemo(
    () => filterAssignedPolicies(policies, onboardingRecommendation, session?.role ?? ""),
    [policies, onboardingRecommendation, session?.role]
  );
  const selectedCourse = useMemo(
    () =>
      courseDetail ?? assignedCourses.find((course) => course.id === selectedCourseId) ?? assignedCourses[0] ?? null,
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
  const policyEffectiveDates = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(policyVersions).map(([policyId, versions]) => [policyId, versions[0]?.effectiveDate ?? null])
      ),
    [policyVersions]
  );
  const completionPercent =
    onboardingProgress?.nextStep?.completionPercentage ?? onboardingProgress?.progress?.completionPercentage ?? 0;
  const overdueCount = compliance.filter((item) => item.status === "overdue").length;
  const pendingItems = useMemo(
    () =>
      resolvePendingItems(
        assignedCourses,
        assignedPolicies,
        progress,
        acknowledgements,
        onboardingProgress,
        overdueCount
      ),
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
  const pendingDownloads = downloads.filter((item) => item.status === "pending_sync" || item.status === "preparing").length;
  const assistantPrompts = useMemo(
    () =>
      uniq([
        "What should I do next?",
        "Show incomplete training",
        "Which policy is still pending?",
        nextPolicy ? `Explain ${nextPolicy.title}` : "Explain my assigned policy",
        nextCourse ? `Help me finish ${nextCourse.title}` : "Summarize my onboarding path"
      ]),
    [nextCourse, nextPolicy]
  );

  useEffect(() => {
    if (!session) {
      resetWorkspace();
      return;
    }
    void loadWorkspace(session);
  }, [session]);

  function resetWorkspace() {
    setBranding(resolveTenantBranding(runtime.tenantId));
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
    setDownloadPolicy("authenticated_only");
    setDownloads([]);
    setQueuedChangesCount(0);
    setError(null);
  }

  function clearError() {
    setError(null);
  }

  async function loadWorkspace(currentSession: EmployeeSession) {
    try {
      setLoading(true);
      setError(null);

      const [
        tenantContext,
        courseList,
        policyList,
        complianceStatus,
        acknowledgementResult,
        config,
        onboarding,
        onboardingState
      ] = await Promise.all([
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
            const result = await fetchPolicyVersions(currentSession, policy.id).catch(() => ({
              versions: [] as PolicyVersionSummary[]
            }));
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
      // Allow the policy detail to render with fallback text when version lookup fails.
    }
  }

  return {
    branding,
    storageScope,
    online,
    loading,
    error,
    clearError,
    courses,
    policies,
    assignedCourses,
    assignedPolicies,
    progress,
    selectedCourse,
    selectedPolicy,
    selectedPolicyVersions,
    currentPolicyVersion,
    policyVersionLabels,
    policyEffectiveDates,
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
    acknowledgements,
    compliance,
    onboardingRecommendation,
    onboardingProgress,
    assistantPrompts,
    openCourse,
    openLesson,
    openPolicy,
    refresh: () => (session ? loadWorkspace(session) : Promise.resolve()),
    resetWorkspace,
    setLesson,
    setProgress,
    setAcknowledgements,
    setCompliance,
    setOnboardingProgress,
    setQueuedChangesCount,
    setError,
    resolveCourseStatus: (course: EmployeeCourse) => resolveCourseStatus(course, progress, compliance),
    resolvePolicyStatus: (policy: EmployeePolicy) =>
      resolvePolicyStatus(policy, acknowledgements, compliance)
  };
}

