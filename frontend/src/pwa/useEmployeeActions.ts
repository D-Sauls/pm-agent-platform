import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { postEmployeeJson } from "../api/employeeTransport";
import { defaultAssistantDemoResponse, getAssistantDemoResult } from "../assistantDemoData";
import {
  clearManagedDownloads,
  clearQueuedProgress,
  flushProgressQueue,
  invalidateUrlsForOffline,
  queueProgressSync
} from "./offline";
import { loadProgressQueue } from "./storage";
import {
  askAssistant,
  createAcknowledgement,
  fetchComplianceStatus,
  fetchMyAcknowledgements,
  fetchOnboardingProgress,
  fetchProgress,
  postProgress
} from "./api";
import type {
  AcknowledgementSummary,
  ComplianceStatusItem,
  CourseProgressSummary,
  DownloadRecord,
  EmployeeCourse,
  EmployeeOnboardingProgress,
  EmployeeOnboardingRecommendation,
  EmployeePolicy,
  EmployeeSession
} from "./types";
import type { TenantRuntime } from "./runtime";
import type { AssistantResponse, EmployeeWorkspaceError } from "./workspaceTypes";
import { toEmployeeSessionAccess } from "../session/employeeSession";

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

function normalizeQueuedPath(path: string, basePath: string): string {
  if (basePath && path.startsWith(`${basePath}/api/`)) {
    return path.slice(basePath.length + 4);
  }
  const apiIndex = path.indexOf("/api/");
  if (apiIndex >= 0) {
    return path.slice(apiIndex + 4);
  }
  return path;
}

export function useEmployeeActions(input: {
  session: EmployeeSession | null;
  runtime: TenantRuntime;
  storageScope: string;
  online: boolean;
  selectedCourse: EmployeeCourse | null;
  selectedPolicy: EmployeePolicy | null;
  lesson: EmployeeCourse["modules"][number]["lessons"][number] | null;
  progress: Record<string, CourseProgressSummary>;
  onboardingRecommendation: EmployeeOnboardingRecommendation | null;
  onboardingProgress: EmployeeOnboardingProgress | null;
  refreshWorkspace: () => Promise<void>;
  setProgress: Dispatch<SetStateAction<Record<string, CourseProgressSummary>>>;
  setAcknowledgements: Dispatch<SetStateAction<AcknowledgementSummary[]>>;
  setCompliance: Dispatch<SetStateAction<ComplianceStatusItem[]>>;
  setOnboardingProgress: Dispatch<SetStateAction<EmployeeOnboardingProgress | null>>;
  setQueuedChangesCount: Dispatch<SetStateAction<number>>;
}) {
  const {
    session,
    runtime,
    storageScope,
    online,
    selectedCourse,
    selectedPolicy,
    lesson,
    progress,
    onboardingRecommendation,
    onboardingProgress,
    refreshWorkspace,
    setProgress,
    setAcknowledgements,
    setCompliance,
    setOnboardingProgress,
    setQueuedChangesCount
  } = input;

  const [assistantReply, setAssistantReply] = useState<AssistantResponse | null>(defaultAssistantDemoResponse);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<EmployeeWorkspaceError | null>(null);

  useEffect(() => {
    if (!session || !online) {
      return;
    }

    void syncQueuedProgress();
  }, [online, session, storageScope]);

  function clearError() {
    setError(null);
  }

  async function syncQueuedProgress() {
    if (!session) {
      return;
    }

    await flushProgressQueue(
      (path, payload) =>
        postEmployeeJson(
          normalizeQueuedPath(path, runtime.basePath),
          toEmployeeSessionAccess(session),
          payload
        ).then(() => undefined),
      storageScope
    );
    setQueuedChangesCount(loadProgressQueue(storageScope).length);
    await refreshWorkspace();
  }

  async function completeLesson() {
    if (!session || !selectedCourse || !lesson) {
      return;
    }

    const module = selectedCourse.modules.find((entry) =>
      entry.lessons.some((candidate) => candidate.id === lesson.id)
    );
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
        fetchOnboardingProgress(session).catch(() =>
          fallbackOnboardingSnapshot(onboardingRecommendation, onboardingProgress)
        )
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

  async function clearSessionArtifacts(downloads: DownloadRecord[]) {
    const cachedUrls = downloads.flatMap((item) => item.urls);
    await invalidateUrlsForOffline(cachedUrls);
    clearManagedDownloads(storageScope);
    clearQueuedProgress(storageScope);
  }

  return {
    loading,
    error,
    clearError,
    assistantReply,
    assistantLoading,
    selectedPolicy,
    syncQueuedProgress,
    completeLesson,
    acknowledgePolicy,
    submitAssistantPrompt,
    clearSessionArtifacts
  };
}
