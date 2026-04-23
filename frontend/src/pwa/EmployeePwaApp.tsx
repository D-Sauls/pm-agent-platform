import { type CSSProperties, type FormEvent, useEffect, useState } from "react";
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
import { useEmployeeWorkspace } from "./useEmployeeWorkspace";
import { type ThemeMode, useThemeMode } from "./theme";
import type { EmployeeCourse, EmployeePolicy, EmployeeTab } from "./types";

const NAV_ITEMS: Array<{ key: EmployeeTab; label: string }> = [
  { key: "home", label: "Home" },
  { key: "training", label: "Training" },
  { key: "policies", label: "Policies" },
  { key: "help", label: "Help" }
];

export function EmployeePwaApp() {
  const workspace = useEmployeeWorkspace();
  const { themeMode, setThemeMode } = useThemeMode();
  const [tab, setTab] = useState<EmployeeTab>("home");
  const [trainingDetailOpen, setTrainingDetailOpen] = useState(false);
  const [policyDetailOpen, setPolicyDetailOpen] = useState(false);
  const [policyConfirmed, setPolicyConfirmed] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");

  useEffect(() => {
    setPolicyConfirmed(false);
  }, [workspace.selectedPolicy?.id]);

  if (!workspace.session) {
    return (
      <AuthScreen
        appName={workspace.branding.appName}
        logoText={workspace.branding.logoText}
        welcomeMessage={workspace.branding.welcomeMessage}
        authMode={workspace.authMode}
        onChangeAuthMode={workspace.setAuthMode}
        activationToken={workspace.activationToken}
        onActivationTokenChange={workspace.setActivationToken}
        onActivate={workspace.activateAccount}
        onLogin={workspace.signIn}
        passwordResetUrl={workspace.runtime.passwordResetUrl}
        loading={workspace.authLoading}
        error={workspace.error?.message}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
      />
    );
  }

  const brandStyle = {
    "--brand-primary": workspace.branding.primaryColor,
    "--brand-accent": workspace.branding.accentColor
  } as CSSProperties;

  function openPrimaryTask() {
    if (workspace.assignedCourses[0]) {
      setTab("training");
      setTrainingDetailOpen(true);
      void workspace.openCourse(workspace.assignedCourses[0].id);
      return;
    }
    if (workspace.assignedPolicies[0]) {
      setTab("policies");
      setPolicyDetailOpen(true);
      void workspace.openPolicy(workspace.assignedPolicies[0].id);
    }
  }

  function handleOpenCourse(course: EmployeeCourse) {
    setTab("training");
    setTrainingDetailOpen(true);
    void workspace.openCourse(course.id);
  }

  function handleOpenPolicy(policy: EmployeePolicy) {
    setTab("policies");
    setPolicyDetailOpen(true);
    void workspace.openPolicy(policy.id);
  }

  async function handlePolicyAcknowledge() {
    if (!workspace.selectedPolicy || !policyConfirmed) {
      return;
    }
    await workspace.acknowledgePolicy(workspace.selectedPolicy.id);
    setPolicyConfirmed(false);
  }

  async function handleAssistantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await workspace.submitAssistantPrompt(assistantInput);
  }

  return (
    <main className="employee-mobile-app" style={brandStyle}>
      <header className="employee-header">
        <div className="employee-header__brand">
          <div className="brand-mark">{workspace.branding.logoText}</div>
          <div>
            <p className="eyebrow">Assigned onboarding</p>
            <h1>{workspace.branding.appName}</h1>
          </div>
        </div>
        <div className="employee-header__actions">
          <ThemeToggle value={themeMode} onChange={setThemeMode} />
          <button type="button" className="ghost-button" onClick={() => void workspace.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {!workspace.online ? (
        <Banner tone="warning" title="Offline mode">
          Downloaded courses stay available. {workspace.queuedChangesCount > 0 ? `${workspace.queuedChangesCount} progress update${workspace.queuedChangesCount === 1 ? "" : "s"} will sync automatically.` : "New progress will queue until you reconnect."}
        </Banner>
      ) : null}

      {workspace.error ? (
        <Banner tone="error" title="Something needs attention">
          <span>{workspace.error.message}</span>
          {workspace.error.retryLabel ? (
            <button type="button" className="ghost-button" onClick={() => void workspace.retry()}>
              {workspace.error.retryLabel}
            </button>
          ) : null}
        </Banner>
      ) : null}

      {workspace.loading ? <Banner tone="info" title="Refreshing your assigned workspace" /> : null}

      <section className="employee-content">
        {tab === "home" ? (
          <HomeTabView
            completionPercent={workspace.completionPercent}
            nextStepTitle={workspace.nextStepTitle}
            nextStepDescription={workspace.nextStepDescription}
            pendingItems={workspace.pendingItems}
            overdueCount={workspace.overdueCount}
            readyDownloads={workspace.readyDownloads}
            pendingDownloads={workspace.pendingDownloads}
            onContinue={openPrimaryTask}
          />
        ) : null}

        {tab === "training" ? (
          trainingDetailOpen && workspace.selectedCourse ? (
            <CourseDetailView
              course={workspace.selectedCourse}
              lesson={workspace.lesson}
              progressPercent={workspace.progress[workspace.selectedCourse.id]?.progressPercent ?? 0}
              status={workspace.resolveCourseStatus(workspace.selectedCourse)}
              offline={!workspace.online}
              onBack={() => {
                setTrainingDetailOpen(false);
                workspace.setLesson(null);
              }}
              onOpenLesson={(lessonId) => void workspace.openLesson(workspace.selectedCourse!.id, lessonId)}
              onCompleteLesson={() => void workspace.completeLesson()}
            />
          ) : (
            <TrainingListView
              courses={workspace.assignedCourses}
              progress={workspace.progress}
              resolveStatus={workspace.resolveCourseStatus}
              onOpenCourse={handleOpenCourse}
            />
          )
        ) : null}

        {tab === "policies" ? (
          policyDetailOpen && workspace.selectedPolicy ? (
            <PolicyDetailView
              policy={workspace.selectedPolicy}
              status={workspace.resolvePolicyStatus(workspace.selectedPolicy)}
              currentVersionLabel={workspace.currentPolicyVersion?.versionLabel ?? "Current version"}
              effectiveDate={workspace.currentPolicyVersion?.effectiveDate ?? null}
              changeSummary={workspace.currentPolicyVersion?.changeSummary ?? null}
              checked={policyConfirmed}
              onCheckedChange={setPolicyConfirmed}
              onBack={() => setPolicyDetailOpen(false)}
              onAcknowledge={() => void handlePolicyAcknowledge()}
            />
          ) : (
            <PoliciesListView
              policies={workspace.assignedPolicies}
              resolveStatus={workspace.resolvePolicyStatus}
              onOpenPolicy={handleOpenPolicy}
              versionLookup={(policy) => workspace.policyVersionLabels[policy.id] ?? "Current version"}
            />
          )
        ) : null}

        {tab === "help" ? (
          <HelpTabView
            prompts={workspace.assistantPrompts}
            input={assistantInput}
            onInputChange={setAssistantInput}
            onPrompt={(prompt) => {
              setAssistantInput(prompt);
              void workspace.submitAssistantPrompt(prompt);
            }}
            onSubmit={handleAssistantSubmit}
            loading={workspace.assistantLoading}
            reply={workspace.assistantReply}
            nextStepTitle={workspace.nextStepTitle}
            pendingItems={workspace.pendingItems}
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
