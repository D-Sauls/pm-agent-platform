import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import {
  AuthScreen,
  Banner,
  CourseDetailView,
  HelpTabView,
  HomeTabView,
  PoliciesListView,
  PolicyDetailView,
  ThemeToggle,
  TrainingListView
} from "./EmployeePwaViews";
import { type ThemeMode, useThemeMode } from "./theme";
import type { DownloadRecord, EmployeeCourse, EmployeePolicy, EmployeeTab } from "./types";
import { useEmployeeActions } from "./useEmployeeActions";
import { useEmployeeAuth } from "./useEmployeeAuth";
import { useEmployeeWorkspaceData } from "./useEmployeeWorkspaceData";

const NAV_ITEMS: Array<{ key: EmployeeTab; label: string }> = [
  { key: "home", label: "Home" },
  { key: "training", label: "Training" },
  { key: "policies", label: "Policies" },
  { key: "help", label: "Help" }
];

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

type OfflineIndicator = {
  label: string;
  tone: BadgeTone;
};

function buildGreeting(displayName: string): string {
  const hour = new Date().getHours();
  const firstName = displayName.split(" ").filter(Boolean)[0] ?? displayName;
  const intro = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${intro}, ${firstName}`;
}

function resolveDownloadIndicator(record: DownloadRecord | undefined, online: boolean): OfflineIndicator {
  if (!record) {
    return online
      ? { label: "Preparing offline access", tone: "info" }
      : { label: "Will sync when online", tone: "warning" };
  }

  if (record.status === "ready") {
    return { label: "Available offline", tone: "success" };
  }

  if (record.status === "pending_sync") {
    return { label: "Will sync when online", tone: "warning" };
  }

  return { label: record.reason ?? "Offline restricted", tone: "neutral" };
}

function findFirstLessonId(course: EmployeeCourse | null): string | null {
  if (!course) {
    return null;
  }
  return course.modules.flatMap((module) => module.lessons)[0]?.id ?? null;
}

export function EmployeePwaApp() {
  const auth = useEmployeeAuth();
  const data = useEmployeeWorkspaceData({ session: auth.session, runtime: auth.runtime });
  const actions = useEmployeeActions({
    session: auth.session,
    runtime: auth.runtime,
    storageScope: data.storageScope,
    online: data.online,
    selectedCourse: data.selectedCourse,
    selectedPolicy: data.selectedPolicy,
    lesson: data.lesson,
    progress: data.progress,
    onboardingRecommendation: data.onboardingRecommendation,
    onboardingProgress: data.onboardingProgress,
    refreshWorkspace: data.refresh,
    setProgress: data.setProgress,
    setAcknowledgements: data.setAcknowledgements,
    setCompliance: data.setCompliance,
    setOnboardingProgress: data.setOnboardingProgress,
    setQueuedChangesCount: data.setQueuedChangesCount
  });
  const { themeMode, setThemeMode } = useThemeMode();
  const [tab, setTab] = useState<EmployeeTab>("home");
  const [trainingDetailOpen, setTrainingDetailOpen] = useState(false);
  const [policyDetailOpen, setPolicyDetailOpen] = useState(false);
  const [policyConfirmed, setPolicyConfirmed] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");

  const workspaceError = useMemo(() => {
    if (!auth.session) {
      return auth.error ? { message: auth.error } : null;
    }
    return data.error ?? actions.error;
  }, [actions.error, auth.error, auth.session, data.error]);
  const workspaceLoading = data.loading || actions.loading;

  const downloadLookup = useMemo(
    () => new Map(data.downloads.map((item) => [item.id, item] as const)),
    [data.downloads]
  );
  const greeting = auth.session ? buildGreeting(auth.session.displayName) : "Welcome";
  const nextCourse = data.assignedCourses.find((course) => data.resolveCourseStatus(course) !== "completed") ?? data.assignedCourses[0] ?? null;
  const nextPolicy = data.assignedPolicies.find((policy) => data.resolvePolicyStatus(policy) !== "completed") ?? data.assignedPolicies[0] ?? null;
  const incompleteTrainingCount = data.assignedCourses.filter((course) => data.resolveCourseStatus(course) !== "completed").length;
  const pendingPolicyTitle = nextPolicy?.title ?? null;
  const courseContinueLessonId = data.lesson?.id ?? findFirstLessonId(data.selectedCourse);
  const courseContinueLabel = data.lesson ? `Continue ${data.lesson.title}` : courseContinueLessonId ? "Start next lesson" : "Review course";
  const selectedCourseOffline = data.selectedCourse
    ? resolveDownloadIndicator(downloadLookup.get(`course:${data.selectedCourse.id}`), data.online)
    : { label: "Preparing offline access", tone: "info" as const };

  useEffect(() => {
    setPolicyConfirmed(false);
  }, [data.selectedPolicy?.id]);

  if (!auth.session) {
    return (
      <AuthScreen
        appName={data.branding.appName}
        logoText={data.branding.logoText}
        welcomeMessage={data.branding.welcomeMessage}
        authMode={auth.authMode}
        onChangeAuthMode={auth.setAuthMode}
        activationToken={auth.activationToken}
        onActivationTokenChange={auth.setActivationToken}
        onActivate={async (input) => {
          await auth.activateAccount(input);
        }}
        onLogin={async (input) => {
          await auth.signIn(input);
        }}
        passwordResetUrl={auth.runtime.passwordResetUrl}
        loading={auth.loading}
        error={workspaceError?.message}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
      />
    );
  }

  const brandStyle = {
    "--brand-primary": data.branding.primaryColor,
    "--brand-accent": data.branding.accentColor
  } as CSSProperties;

  function openPrimaryTask() {
    if (nextCourse) {
      setTab("training");
      setTrainingDetailOpen(true);
      void data.openCourse(nextCourse.id);
      return;
    }
    if (nextPolicy) {
      setTab("policies");
      setPolicyDetailOpen(true);
      void data.openPolicy(nextPolicy.id);
    }
  }

  function handleOpenCourse(course: EmployeeCourse) {
    setTab("training");
    setTrainingDetailOpen(true);
    void data.openCourse(course.id);
  }

  function handleOpenPolicy(policy: EmployeePolicy) {
    setTab("policies");
    setPolicyDetailOpen(true);
    void data.openPolicy(policy.id);
  }

  function handleContinueCourse() {
    if (!data.selectedCourse || !courseContinueLessonId) {
      return;
    }
    void data.openLesson(data.selectedCourse.id, courseContinueLessonId);
  }

  async function handlePolicyAcknowledge() {
    if (!data.selectedPolicy || !policyConfirmed) {
      return;
    }
    await actions.acknowledgePolicy(data.selectedPolicy.id);
    setPolicyConfirmed(false);
  }

  async function handleAssistantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await actions.submitAssistantPrompt(assistantInput);
  }

  async function handleSignOut() {
    await actions.clearSessionArtifacts(data.downloads);
    data.resetWorkspace();
    auth.signOut();
    actions.clearError();
    data.clearError();
  }

  return (
    <main className="employee-mobile-app" style={brandStyle}>
      <div className="employee-mobile-app__frame">
        <header className="employee-header">
          <div className="employee-header__brand">
            <div className="brand-mark">{data.branding.logoText}</div>
            <div>
              <p className="eyebrow">Assigned onboarding</p>
              <h1>{data.branding.appName}</h1>
            </div>
          </div>
          <div className="employee-header__actions">
            <ThemeToggle value={themeMode} onChange={setThemeMode} />
            <button type="button" className="ghost-button ghost-button--compact" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          </div>
        </header>

        {!data.online ? (
          <Banner tone="warning" title="Offline mode">
            Downloaded courses stay available. {data.queuedChangesCount > 0 ? `${data.queuedChangesCount} progress update${data.queuedChangesCount === 1 ? "" : "s"} will sync automatically.` : "New progress will queue until you reconnect."}
          </Banner>
        ) : null}

        {workspaceError ? (
          <Banner tone="error" title="Something needs attention">
            <span>{workspaceError.message}</span>
            {workspaceError.retryLabel ? (
              <button type="button" className="ghost-button ghost-button--compact" onClick={() => void data.refresh()}>
                {workspaceError.retryLabel}
              </button>
            ) : null}
          </Banner>
        ) : null}

        {workspaceLoading ? <Banner tone="info" title="Refreshing your assigned workspace" /> : null}

        <section className="employee-content">
          {tab === "home" ? (
            <HomeTabView
              greeting={greeting}
              employeeName={auth.session.displayName}
              completionPercent={data.completionPercent}
              nextStepTitle={data.nextStepTitle}
              nextStepDescription={data.nextStepDescription}
              pendingItems={data.pendingItems}
              overdueCount={data.overdueCount}
              readyDownloads={data.readyDownloads}
              pendingDownloads={data.pendingDownloads}
              onContinue={openPrimaryTask}
            />
          ) : null}

          {tab === "training" ? (
            trainingDetailOpen && data.selectedCourse ? (
              <CourseDetailView
                course={data.selectedCourse}
                lesson={data.lesson}
                progressPercent={data.progress[data.selectedCourse.id]?.progressPercent ?? 0}
                status={data.resolveCourseStatus(data.selectedCourse)}
                offlineIndicator={selectedCourseOffline}
                continueLabel={courseContinueLabel}
                selectedLessonId={data.lesson?.id ?? null}
                onBack={() => {
                  setTrainingDetailOpen(false);
                  data.setLesson(null);
                }}
                onContinue={handleContinueCourse}
                onOpenLesson={(lessonId) => void data.openLesson(data.selectedCourse!.id, lessonId)}
                onCompleteLesson={() => void actions.completeLesson()}
              />
            ) : (
              <TrainingListView
                courses={data.assignedCourses}
                progress={data.progress}
                resolveStatus={data.resolveCourseStatus}
                offlineLookup={(courseId) => resolveDownloadIndicator(downloadLookup.get(`course:${courseId}`), data.online)}
                onOpenCourse={handleOpenCourse}
              />
            )
          ) : null}

          {tab === "policies" ? (
            policyDetailOpen && data.selectedPolicy ? (
              <PolicyDetailView
                policy={data.selectedPolicy}
                status={data.resolvePolicyStatus(data.selectedPolicy)}
                currentVersionLabel={data.currentPolicyVersion?.versionLabel ?? "Current version"}
                effectiveDate={data.currentPolicyVersion?.effectiveDate ?? null}
                changeSummary={data.currentPolicyVersion?.changeSummary ?? null}
                checked={policyConfirmed}
                onCheckedChange={setPolicyConfirmed}
                onBack={() => setPolicyDetailOpen(false)}
                onAcknowledge={() => void handlePolicyAcknowledge()}
              />
            ) : (
              <PoliciesListView
                policies={data.assignedPolicies}
                resolveStatus={data.resolvePolicyStatus}
                onOpenPolicy={handleOpenPolicy}
                versionLookup={(policy) => data.policyVersionLabels[policy.id] ?? "Current version"}
                effectiveDateLookup={(policy) => data.policyEffectiveDates[policy.id] ?? null}
              />
            )
          ) : null}

          {tab === "help" ? (
            <HelpTabView
              prompts={data.assistantPrompts}
              input={assistantInput}
              onInputChange={setAssistantInput}
              onPrompt={(prompt) => {
                setAssistantInput(prompt);
                void actions.submitAssistantPrompt(prompt);
              }}
              onSubmit={handleAssistantSubmit}
              loading={actions.assistantLoading}
              reply={actions.assistantReply}
              nextStepTitle={data.nextStepTitle}
              pendingItems={data.pendingItems}
              pendingPolicyTitle={pendingPolicyTitle}
              incompleteTrainingCount={incompleteTrainingCount}
            />
          ) : null}
        </section>
      </div>

      <nav className="bottom-nav" aria-label="Employee navigation">
        <div className="bottom-nav__inner">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={tab === item.key ? "bottom-nav__item bottom-nav__item--active" : "bottom-nav__item"}
              onClick={() => {
                setTab(item.key);
                if (item.key !== "training") {
                  setTrainingDetailOpen(false);
                }
                if (item.key !== "policies") {
                  setPolicyDetailOpen(false);
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
