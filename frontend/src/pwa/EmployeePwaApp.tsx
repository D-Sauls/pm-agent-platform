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
import type { EmployeeCourse, EmployeePolicy, EmployeeTab } from "./types";
import { useEmployeeActions } from "./useEmployeeActions";
import { useEmployeeAuth } from "./useEmployeeAuth";
import { useEmployeeWorkspaceData } from "./useEmployeeWorkspaceData";

const NAV_ITEMS: Array<{ key: EmployeeTab; label: string }> = [
  { key: "home", label: "Home" },
  { key: "training", label: "Training" },
  { key: "policies", label: "Policies" },
  { key: "help", label: "Help" }
];

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
    if (data.assignedCourses[0]) {
      setTab("training");
      setTrainingDetailOpen(true);
      void data.openCourse(data.assignedCourses[0].id);
      return;
    }
    if (data.assignedPolicies[0]) {
      setTab("policies");
      setPolicyDetailOpen(true);
      void data.openPolicy(data.assignedPolicies[0].id);
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
          <button type="button" className="ghost-button" onClick={() => void handleSignOut()}>
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
            <button type="button" className="ghost-button" onClick={() => void data.refresh()}>
              {workspaceError.retryLabel}
            </button>
          ) : null}
        </Banner>
      ) : null}

      {workspaceLoading ? <Banner tone="info" title="Refreshing your assigned workspace" /> : null}

      <section className="employee-content">
        {tab === "home" ? (
          <HomeTabView
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
              offline={!data.online}
              onBack={() => {
                setTrainingDetailOpen(false);
                data.setLesson(null);
              }}
              onOpenLesson={(lessonId) => void data.openLesson(data.selectedCourse!.id, lessonId)}
              onCompleteLesson={() => void actions.completeLesson()}
            />
          ) : (
            <TrainingListView
              courses={data.assignedCourses}
              progress={data.progress}
              resolveStatus={data.resolveCourseStatus}
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
          />
        ) : null}
      </section>

      <nav className="bottom-nav" aria-label="Employee navigation">
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
      </nav>
    </main>
  );
}
