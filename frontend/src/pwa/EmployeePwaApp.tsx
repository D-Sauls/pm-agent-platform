import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
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
  postProgress
} from "./api";
import { resolveTenantBranding } from "./branding";
import { cacheUrlsForOffline, canDownloadByPolicy, flushProgressQueue, queueProgressSync, registerDownload } from "./offline";
import { clearSession, loadDownloads, loadSession, saveSession } from "./storage";
import type { DownloadRecord, EmployeeCourse, EmployeeOnboardingProgress, EmployeeOnboardingRecommendation, EmployeePage, EmployeePolicy, EmployeeSession, TenantBranding } from "./types";
import {
  buildAssistantPrompts,
  buildDashboardCards,
  buildRecentActivity,
  buildTrainingGroups,
  getPrimaryNavigation,
  type DashboardMetric
} from "./viewModels";

type LessonDetail = EmployeeCourse["modules"][number]["lessons"][number];

type AssistantResponse = {
  synthesizedSummary: string;
  keyFindings: string[];
  recommendedActions: string[];
  warnings: string[];
  workflowsExecuted: string[];
};

type ErrorState = {
  message: string;
  retryLabel?: string;
};

function useOnlineStatus(): boolean {
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

function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return deferredPrompt;
}

const primaryNav = getPrimaryNavigation();

export function EmployeePwaApp() {
  const [session, setSession] = useState<EmployeeSession | null>(() => loadSession());
  const [page, setPage] = useState<EmployeePage>("dashboard");
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [courses, setCourses] = useState<EmployeeCourse[]>([]);
  const [policies, setPolicies] = useState<EmployeePolicy[]>([]);
  const [courseDetail, setCourseDetail] = useState<EmployeeCourse | null>(null);
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [compliance, setCompliance] = useState<any[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<any[]>([]);
  const [assistantReply, setAssistantReply] = useState<AssistantResponse | null>(null);
  const [assistantInput, setAssistantInput] = useState("");
  const [downloads, setDownloads] = useState<DownloadRecord[]>(() => loadDownloads());
  const [onboardingRecommendation, setOnboardingRecommendation] = useState<EmployeeOnboardingRecommendation | null>(null);
  const [onboardingProgress, setOnboardingProgress] = useState<EmployeeOnboardingProgress | null>(null);
  const [downloadPolicy, setDownloadPolicy] = useState("authenticated_only");
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const online = useOnlineStatus();
  const deferredPrompt = useInstallPrompt();

  useEffect(() => {
    if (!session) return;
    void loadDashboardData(session);
  }, [session]);

  useEffect(() => {
    if (!session || !online) return;
    void flushProgressQueue((path, payload) =>
      fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.userId}|${session.tenantId}|pm`,
          "x-tenant-id": session.tenantId
        },
        body: JSON.stringify(payload)
      }).then((response) => {
        if (!response.ok) {
          throw new Error("sync failed");
        }
      })
    );
  }, [session, online]);

  const trainingGroups = useMemo(() => buildTrainingGroups(courses, progress, session?.role ?? ""), [courses, progress, session?.role]);
  const dashboardCards = useMemo(
    () => buildDashboardCards(courses, progress, compliance, acknowledgements, session?.role ?? ""),
    [courses, progress, compliance, acknowledgements, session?.role]
  );
  const recentActivity = useMemo(() => buildRecentActivity(courseDetail, lesson, acknowledgements), [courseDetail, lesson, acknowledgements]);
  const assistantPrompts = useMemo(
    () => buildAssistantPrompts(courseDetail?.title, policies[0]?.title, compliance.some((item) => item.status === "overdue")),
    [courseDetail?.title, policies, compliance]
  );
  const activeComplianceItems = useMemo(() => compliance.filter((item) => item.status !== "completed"), [compliance]);

  async function loadDashboardData(currentSession: EmployeeSession) {
    try {
      setLoading(true);
      setError(null);
      const [tenantContext, courseList, policyList, complianceStatus, acknowledgementResult, config, onboarding, onboardingStatus] = await Promise.all([
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
      setOnboardingProgress(onboardingStatus);

      const relevantCourses = courseList.filter((course) => course.roleTargets.length === 0 || course.roleTargets.includes(currentSession.role));
      const progressEntries = await Promise.all(
        relevantCourses.map(async (course) => [course.id, await fetchProgress(currentSession, course.id)] as const)
      );
      setProgress(Object.fromEntries(progressEntries));

      if (!selectedCourseId && relevantCourses[0]) {
        setSelectedCourseId(relevantCourses[0].id);
      }
      if (!selectedPolicyId && policyList[0]) {
        setSelectedPolicyId(policyList[0].id);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to load your workspace.";
      setError({
        message: online ? message : "You are offline. Cached content is still available where it has already been downloaded.",
        retryLabel: "Retry"
      });
    } finally {
      setLoading(false);
    }
  }

  async function openCourse(courseId: string) {
    if (!session) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await fetchCourse(session, courseId);
      setSelectedCourseId(courseId);
      setCourseDetail(detail);
      setLesson(null);
      setSelectedLessonId(null);
      setPage("assigned");
    } catch (caught) {
      setError({ message: caught instanceof Error ? caught.message : "Unable to open the course.", retryLabel: "Retry" });
    } finally {
      setLoading(false);
    }
  }

  async function openLesson(courseId: string, lessonId: string) {
    if (!session) return;
    try {
      setLoading(true);
      setError(null);
      if (!courseDetail || courseDetail.id !== courseId) {
        const detail = await fetchCourse(session, courseId);
        setCourseDetail(detail);
        setSelectedCourseId(courseId);
      }
      const detail = await fetchLesson(session, lessonId);
      setSelectedLessonId(lessonId);
      setLesson(detail);
      setPage("assigned");
    } catch (caught) {
      setError({ message: caught instanceof Error ? caught.message : "Unable to open the lesson.", retryLabel: "Retry" });
    } finally {
      setLoading(false);
    }
  }

  function openPolicy(policyId: string) {
    setSelectedPolicyId(policyId);
    setPage("policies");
  }
  async function completeLesson() {
    if (!session || !courseDetail || !lesson) return;
    const module = courseDetail.modules.find((entry) => entry.lessons.some((candidate) => candidate.id === lesson.id));
    if (!module) return;

    const payload = {
      courseId: courseDetail.id,
      moduleId: module.id,
      lessonId: lesson.id,
      completionStatus: "completed"
    };

    try {
      if (online) {
        await postProgress(session, payload);
      } else {
        queueProgressSync({
          id: `queued-${Date.now()}`,
          path: "/api/learning/progress",
          payload: {
            tenantId: session.tenantId,
            userId: session.userId,
            ...payload
          },
          createdAt: new Date().toISOString()
        });
      }

      const nextProgress = await fetchProgress(session, courseDetail.id).catch(() => ({
        ...(progress[courseDetail.id] ?? {}),
        status: "in_progress",
        progressPercent: Math.min(100, (progress[courseDetail.id]?.progressPercent ?? 0) + 20)
      }));
      setProgress((current) => ({ ...current, [courseDetail.id]: nextProgress }));
      setAssistantReply({
        synthesizedSummary: online
          ? "Lesson progress recorded successfully."
          : "Lesson progress was saved locally and will sync when you are back online.",
        keyFindings: [lesson.title],
        recommendedActions: ["Continue the next lesson when ready."],
        warnings: online ? [] : ["Sync pending until network connectivity returns."],
        workflowsExecuted: ["LearningProgressWorkflow"]
      });
    } catch (caught) {
      setError({
        message: caught instanceof Error ? caught.message : "Unable to update lesson progress.",
        retryLabel: "Retry"
      });
    }
  }

  async function acknowledgeCurrentPolicy() {
    if (!session || !selectedPolicyId) return;
    try {
      setLoading(true);
      const versions = await fetchPolicyVersions(session, selectedPolicyId);
      const currentVersion = versions.versions.find((version) => version.id) ?? versions.versions[0];
      await createAcknowledgement(session, {
        subjectType: "policy",
        subjectId: selectedPolicyId,
        subjectVersionId: currentVersion?.id ?? null,
        acknowledgementType: "accepted"
      });
      const refreshed = await fetchMyAcknowledgements(session);
      setAcknowledgements(refreshed.acknowledgements);
    } catch (caught) {
      setError({ message: caught instanceof Error ? caught.message : "Unable to record acknowledgement.", retryLabel: "Retry" });
    } finally {
      setLoading(false);
    }
  }

  async function downloadCourse(course: EmployeeCourse) {
    const permission = canDownloadByPolicy(downloadPolicy);
    if (!permission.allowed) {
      registerDownload({
        id: course.id,
        title: course.title,
        urls: [],
        downloadedAt: new Date().toISOString(),
        status: "blocked",
        reason: permission.reason
      });
      setDownloads(loadDownloads());
      return;
    }

    const urls = course.modules.flatMap((module) =>
      module.lessons.map((entry) => entry.contentReference).filter((reference) => reference.startsWith("/"))
    );

    await cacheUrlsForOffline(urls);
    registerDownload({
      id: course.id,
      title: course.title,
      urls,
      downloadedAt: new Date().toISOString(),
      status: online ? "ready" : "pending_sync"
    });
    setDownloads(loadDownloads());
  }

  async function retryDownloads() {
    const retryable = downloads.filter((entry) => entry.status === "pending_sync");
    for (const item of retryable) {
      await cacheUrlsForOffline(item.urls);
      registerDownload({ ...item, status: "ready", downloadedAt: new Date().toISOString() });
    }
    setDownloads(loadDownloads());
  }

  async function submitAssistantPrompt(message: string) {
    if (!session || !message.trim()) return;
    try {
      setAssistantLoading(true);
      setError(null);
      const reply = await askAssistant(session, message.trim());
      setAssistantReply(reply.response);
      setAssistantInput(message.trim());
      setPage("assistant");
    } catch (caught) {
      setError({ message: caught instanceof Error ? caught.message : "Assistant response failed.", retryLabel: "Retry" });
    } finally {
      setAssistantLoading(false);
    }
  }

  async function installApp() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
  }

  function retryCurrentAction() {
    if (session) {
      void loadDashboardData(session);
    }
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextSession: EmployeeSession = {
      tenantId: String(formData.get("tenantId") || "tenant-acme"),
      userId: String(formData.get("userId") || "user-finance-analyst"),
      displayName: String(formData.get("displayName") || "Avery Johnson"),
      role: String(formData.get("role") || "Finance Analyst"),
      department: String(formData.get("department") || "Finance")
    };
    saveSession(nextSession);
    setSession(nextSession);
    setPage("dashboard");
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setBranding(null);
    setCourses([]);
    setPolicies([]);
    setCourseDetail(null);
    setLesson(null);
    setProgress({});
    setCompliance([]);
    setAcknowledgements([]);
    setDownloads(loadDownloads());
    setAssistantReply(null);
  }

  if (!session) {
    return (
      <main className="employee-shell employee-shell--login">
        <section className="login-panel">
          <div className="brand-mark">LK</div>
          <h1>Learning, Knowledge, and Compliance</h1>
          <p>Sign in to view assigned learning, policies, compliance actions, and assistant guidance.</p>
          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Tenant ID
              <input name="tenantId" defaultValue="tenant-acme" />
            </label>
            <label>
              Display name
              <input name="displayName" defaultValue="Avery Johnson" />
            </label>
            <label>
              User ID
              <input name="userId" defaultValue="user-finance-analyst" />
            </label>
            <label>
              Role
              <input name="role" defaultValue="Finance Analyst" />
            </label>
            <label>
              Department
              <input name="department" defaultValue="Finance" />
            </label>
            <button type="submit">Enter workspace</button>
          </form>
        </section>
      </main>
    );
  }

  const selectedPolicy = policies.find((policy) => policy.id === selectedPolicyId) ?? policies[0] ?? null;
  const headerTitle = branding?.appName ?? "Learning workspace";

  return (
    <main
      className="employee-shell"
      style={{
        ["--brand-primary" as string]: branding?.primaryColor ?? "#1d3557",
        ["--brand-accent" as string]: branding?.accentColor ?? "#457b9d"
      }}
    >
      <aside className="side-nav">
        <div className="side-nav__brand">
          <div className="brand-mark">{branding?.logoText ?? "LK"}</div>
          <div>
            <strong>{headerTitle}</strong>
            <p>{branding?.welcomeMessage ?? "Learning and compliance, all in one place."}</p>
          </div>
        </div>
        <nav className="side-nav__menu" aria-label="Primary">
          {primaryNav.map((item) => (
            <button key={item.key} className={page === item.key ? "nav-pill nav-pill--active" : "nav-pill"} onClick={() => setPage(item.key)} type="button">
              {item.label}
            </button>
          ))}
        </nav>
        <div className="side-nav__meta">
          <span>{online ? "Online" : "Offline"}</span>
          <span>{downloads.filter((entry) => entry.status === "ready").length} downloads ready</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="top-bar">
          <div>
            <h1>{primaryNav.find((item) => item.key === page)?.label ?? "Workspace"}</h1>
            <p>{branding?.welcomeMessage}</p>
          </div>
          <div className="top-bar__actions">
            {!online && <span className="status-chip">Offline mode</span>}
            {deferredPrompt && (
              <button type="button" className="secondary-button" onClick={() => void installApp()}>
                Install app
              </button>
            )}
            <button type="button" className="secondary-button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        {!online && (
          <section className="banner banner--warning">
            <strong>You are offline.</strong> Downloaded lessons remain available, and progress will sync automatically when you reconnect.
          </section>
        )}

        {error && (
          <section className="banner banner--error">
            <div>
              <strong>We hit a snag.</strong>
              <p>{error.message}</p>
            </div>
            {error.retryLabel && (
              <button type="button" className="secondary-button" onClick={retryCurrentAction}>
                {error.retryLabel}
              </button>
            )}
          </section>
        )}

        {loading && <section className="banner banner--info">Loading your workspace...</section>}
        {page === "dashboard" && (
          <DashboardView
            cards={dashboardCards}
            recentActivity={recentActivity}
            prompts={assistantPrompts}
            onboardingRecommendation={onboardingRecommendation}
            onboardingProgress={onboardingProgress}
            onPrompt={submitAssistantPrompt}
            onOpenTraining={() => setPage("assigned")}
            onOpenCompliance={() => setPage("compliance")}
            onOpenDownloads={() => setPage("downloads")}
          />
        )}

        {page === "assigned" && (
          <section className="grid-layout">
            <section className="panel">
              <div className="panel__header">
                <h2>My Training</h2>
                <p>Assigned, recommended, and recently used courses.</p>
              </div>
              <div className="course-list">
                {trainingGroups.assigned.map((course) => (
                  <article key={course.id} className="list-card">
                    <div>
                      <strong>{course.title}</strong>
                      <p>{course.description}</p>
                      <small>{course.tags.join(" | ")}</small>
                    </div>
                    <div className="list-card__actions">
                      <span className="status-chip">{Math.round(progress[course.id]?.progressPercent ?? 0)}% complete</span>
                      <button type="button" onClick={() => void openCourse(course.id)}>
                        Open course
                      </button>
                    </div>
                  </article>
                ))}
                {trainingGroups.assigned.length === 0 && <EmptyState title="No assigned training" body="Assigned learning will appear here when available." />}
              </div>
            </section>
            <section className="panel panel--detail">
              <div className="panel__header">
                <h2>{courseDetail?.title ?? "Course details"}</h2>
                <p>{courseDetail?.description ?? "Select a course to review modules, lessons, and download options."}</p>
              </div>
              {courseDetail ? (
                <>
                  <div className="detail-actions">
                    <button type="button" onClick={() => void downloadCourse(courseDetail)}>
                      Download for offline use
                    </button>
                    <button type="button" className="secondary-button" onClick={() => void submitAssistantPrompt(`Summarize ${courseDetail.title} for me`)}>
                      Ask assistant
                    </button>
                  </div>
                  <div className="stack-list">
                    {courseDetail.modules.map((module) => (
                      <section key={module.id} className="module-card">
                        <h3>{module.title}</h3>
                        <div className="lesson-list">
                          {module.lessons.map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              className={selectedLessonId === entry.id ? "lesson-row lesson-row--active" : "lesson-row"}
                              onClick={() => void openLesson(courseDetail.id, entry.id)}
                            >
                              <span>{entry.title}</span>
                              <small>{entry.contentType} | {entry.estimatedDuration} min</small>
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState title="Pick a course" body="Choose a course from the left to show its modules and lessons." />
              )}
              {lesson && (
                <section className="lesson-player">
                  <div className="panel__header">
                    <h3>{lesson.title}</h3>
                    <p>{lesson.contentType} lesson</p>
                  </div>
                  <LessonContent lesson={lesson} />
                  <div className="detail-actions">
                    <button type="button" onClick={() => void completeLesson()}>
                      Mark lesson complete
                    </button>
                    <button type="button" className="secondary-button" onClick={() => void submitAssistantPrompt(`Explain ${lesson.title} in simple terms`)}>
                      Ask about this lesson
                    </button>
                  </div>
                </section>
              )}
            </section>
          </section>
        )}

        {page === "policies" && (
          <section className="grid-layout">
            <section className="panel">
              <div className="panel__header">
                <h2>Policies</h2>
                <p>Current policy library and acknowledgement status.</p>
              </div>
              <div className="course-list">
                {policies.map((policy) => (
                  <article key={policy.id} className="list-card">
                    <div>
                      <strong>{policy.title}</strong>
                      <p>{policy.category}</p>
                      <small>{policy.tags.join(" | ")}</small>
                    </div>
                    <div className="list-card__actions">
                      <button type="button" onClick={() => openPolicy(policy.id)}>
                        View policy
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <section className="panel panel--detail">
              <div className="panel__header">
                <h2>{selectedPolicy?.title ?? "Policy details"}</h2>
                <p>{selectedPolicy?.category ?? "Select a policy to review the current version and acknowledgement evidence."}</p>
              </div>
              {selectedPolicy ? (
                <PolicyDetail
                  policy={selectedPolicy}
                  session={session}
                  acknowledgements={acknowledgements}
                  onAcknowledge={acknowledgeCurrentPolicy}
                  onPrompt={submitAssistantPrompt}
                />
              ) : (
                <EmptyState title="No policies available" body="Policies for your role will show up here." />
              )}
            </section>
          </section>
        )}

        {page === "downloads" && (
          <section className="panel">
            <div className="panel__header">
              <h2>Offline Downloads</h2>
              <p>Downloaded content, cache status, and retry controls for offline study.</p>
            </div>
            <div className="detail-actions">
              <button type="button" onClick={() => void retryDownloads()} disabled={!downloads.some((entry) => entry.status === "pending_sync")}>
                Retry pending downloads
              </button>
              <span className="status-chip">Policy: {downloadPolicy.replaceAll("_", " ")}</span>
            </div>
            <div className="course-list">
              {downloads.map((download) => (
                <article key={download.id} className="list-card">
                  <div>
                    <strong>{download.title}</strong>
                    <p>{download.reason ?? `${download.urls.length} cached files prepared.`}</p>
                    <small>{new Date(download.downloadedAt).toLocaleString()}</small>
                  </div>
                  <span className={`status-chip status-chip--${download.status}`}>{download.status.replaceAll("_", " ")}</span>
                </article>
              ))}
              {downloads.length === 0 && <EmptyState title="Nothing downloaded yet" body="Download a course from My Training to make it available offline." />}
            </div>
          </section>
        )}
        {page === "compliance" && (
          <section className="grid-layout grid-layout--tight">
            <section className="panel">
              <div className="panel__header">
                <h2>Compliance Status</h2>
                <p>Outstanding mandatory items and completion state.</p>
              </div>
              <div className="stack-list">
                {activeComplianceItems.map((item) => (
                  <article key={item.requirementId} className="list-card">
                    <div>
                      <strong>{item.requirementId}</strong>
                      <p>Status: {item.status}</p>
                    </div>
                    {item.dueDate && <small>Due {new Date(item.dueDate).toLocaleDateString()}</small>}
                  </article>
                ))}
                {activeComplianceItems.length === 0 && <EmptyState title="You are up to date" body="No outstanding compliance actions right now." />}
              </div>
            </section>
            <section className="panel">
              <div className="panel__header">
                <h2>Acknowledgement History</h2>
                <p>Recent receipts and accepted versions.</p>
              </div>
              <div className="stack-list">
                {acknowledgements.slice(0, 8).map((item) => (
                  <article key={item.id} className="list-card">
                    <div>
                      <strong>{item.subjectType}: {item.subjectId}</strong>
                      <p>{item.acknowledgementType}</p>
                    </div>
                    <small>{new Date(item.recordedAt).toLocaleString()}</small>
                  </article>
                ))}
                {acknowledgements.length === 0 && <EmptyState title="No acknowledgements yet" body="Your evidence history will appear here after policy acceptance or course completion." />}
              </div>
            </section>
          </section>
        )}

        {page === "assistant" && (
          <section className="grid-layout grid-layout--tight">
            <section className="panel">
              <div className="panel__header">
                <h2>AI Assistant</h2>
                <p>Ask about training priorities, policy changes, or compliance status.</p>
              </div>
              <div className="assistant-prompt-list">
                {assistantPrompts.map((prompt) => (
                  <button key={prompt} type="button" className="prompt-chip" onClick={() => void submitAssistantPrompt(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
              <form
                className="assistant-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitAssistantPrompt(assistantInput);
                }}
              >
                <textarea
                  value={assistantInput}
                  rows={5}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  placeholder="Ask what training to complete next, explain a policy, or summarize your compliance gaps."
                />
                <button type="submit" disabled={assistantLoading}>
                  {assistantLoading ? "Thinking..." : "Ask assistant"}
                </button>
              </form>
            </section>
            <section className="panel panel--detail">
              <div className="panel__header">
                <h2>Response</h2>
                <p>Structured guidance aligned to the backend workflow outputs.</p>
              </div>
              {assistantReply ? (
                <div className="assistant-response">
                  <p>{assistantReply.synthesizedSummary}</p>
                  <InfoList title="Key findings" items={assistantReply.keyFindings} />
                  <InfoList title="Recommended actions" items={assistantReply.recommendedActions} />
                  <InfoList title="Warnings" items={assistantReply.warnings} emptyLabel="No warnings." />
                  <InfoList title="Workflows used" items={assistantReply.workflowsExecuted} />
                </div>
              ) : (
                <EmptyState title="Ask a question" body="Try a suggested prompt to get a consistent, workflow-backed response." />
              )}
            </section>
          </section>
        )}

        {page === "profile" && (
          <section className="grid-layout grid-layout--tight">
            <section className="panel">
              <div className="panel__header">
                <h2>Profile</h2>
                <p>Current user and tenant context for this learning workspace.</p>
              </div>
              <dl className="profile-grid">
                <div>
                  <dt>Name</dt>
                  <dd>{session.displayName}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{session.role}</dd>
                </div>
                <div>
                  <dt>Department</dt>
                  <dd>{session.department ?? "Not set"}</dd>
                </div>
                <div>
                  <dt>Tenant</dt>
                  <dd>{session.tenantId}</dd>
                </div>
              </dl>
            </section>
            <section className="panel">
              <div className="panel__header">
                <h2>Performance snapshot</h2>
                <p>Quick indicators to support demos and user confidence.</p>
              </div>
              <InfoList
                title="Highlights"
                items={[
                  `${dashboardCards[0]?.value ?? 0} mandatory items in scope`,
                  `${downloads.filter((entry) => entry.status === "ready").length} downloads cached for offline access`,
                  `${acknowledgements.length} evidence records captured`
                ]}
              />
            </section>
          </section>
        )}
      </section>
    </main>
  );
}

function DashboardView(props: {
  cards: DashboardMetric[];
  recentActivity: string[];
  prompts: string[];
  onboardingRecommendation: EmployeeOnboardingRecommendation | null;
  onboardingProgress: EmployeeOnboardingProgress | null;
  onPrompt: (prompt: string) => Promise<void>;
  onOpenTraining: () => void;
  onOpenCompliance: () => void;
  onOpenDownloads: () => void;
}) {
  return (
    <section className="dashboard-grid">
      <div className="metric-grid">
        {props.cards.map((card) => (
          <article key={card.label} className="metric-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.description}</p>
          </article>
        ))}
      </div>
      <div className="grid-layout grid-layout--tight">
        <section className="panel">
          <div className="panel__header">
            <h2>Quick actions</h2>
            <p>Jump straight into the tasks people usually need first.</p>
          </div>
          <div className="action-grid">
            <button type="button" onClick={props.onOpenTraining}>Open my training</button>
            <button type="button" className="secondary-button" onClick={props.onOpenCompliance}>Review compliance</button>
            <button type="button" className="secondary-button" onClick={props.onOpenDownloads}>Check downloads</button>
          </div>
          <InfoList title="Assistant shortcuts" items={props.prompts} onSelect={props.onPrompt} />
          <InfoList
            title="Onboarding checklist"
            items={props.onboardingProgress?.progress?.remainingItems ?? props.onboardingRecommendation?.nextActions ?? []}
            emptyLabel="Your onboarding checklist is complete."
          />
        </section>
        <section className="panel">
          <div className="panel__header">
            <h2>Recent activity</h2>
            <p>Useful for demos and for helping users get back to where they were.</p>
          </div>
          <InfoList title="Latest" items={props.recentActivity} emptyLabel="Open a lesson or acknowledge a policy to build recent activity." />
          <div className="content-box">
            <strong>Onboarding completion</strong>
            <p>{props.onboardingProgress?.progress ? `${props.onboardingProgress.progress.completionPercentage}% complete` : "No onboarding progress tracked yet."}</p>
            <p>{props.onboardingProgress?.nextStep?.recommendation ?? props.onboardingRecommendation?.nextActions?.[0] ?? "No next action available yet."}</p>
          </div>
        </section>
      </div>
    </section>
  );
}
function PolicyDetail(props: {
  policy: EmployeePolicy;
  session: EmployeeSession;
  acknowledgements: any[];
  onAcknowledge: () => Promise<void>;
  onPrompt: (prompt: string) => Promise<void>;
}) {
  const [versions, setVersions] = useState<Array<{ id: string; versionLabel: string; changeSummary?: string | null }>>([]);

  useEffect(() => {
    void fetchPolicyVersions(props.session, props.policy.id).then((result) => setVersions(result.versions));
  }, [props.policy.id, props.session]);

  const matchingAcknowledgement = props.acknowledgements.find((item) => item.subjectId === props.policy.id);

  return (
    <div className="stack-list">
      <article className="list-card list-card--column">
        <strong>{props.policy.title}</strong>
        <p>{props.policy.documentReference}</p>
        <small>Applies to: {props.policy.applicableRoles.join(", ") || "All roles"}</small>
      </article>
      <InfoList
        title="Versions"
        items={versions.map((version) => `${version.versionLabel}${version.changeSummary ? ` - ${version.changeSummary}` : ""}`)}
        emptyLabel="No version history found."
      />
      <article className="list-card list-card--column">
        <strong>Acknowledgement state</strong>
        <p>
          {matchingAcknowledgement
            ? `${matchingAcknowledgement.acknowledgementType} on ${new Date(matchingAcknowledgement.recordedAt).toLocaleString()}`
            : "Not acknowledged yet"}
        </p>
        <div className="detail-actions">
          <button type="button" onClick={() => void props.onAcknowledge()}>Accept current version</button>
          <button type="button" className="secondary-button" onClick={() => void props.onPrompt(`What changed in policy ${props.policy.title}?`)}>
            Ask what changed
          </button>
        </div>
      </article>
    </div>
  );
}

function LessonContent(props: { lesson: LessonDetail }) {
  if (props.lesson.contentType === "markdown") {
    return <article className="content-box">{props.lesson.contentReference}</article>;
  }

  if (props.lesson.contentType === "video") {
    return <article className="content-box">Video reference: {props.lesson.contentReference}</article>;
  }

  if (props.lesson.contentType === "pdf") {
    return <article className="content-box">PDF reference: {props.lesson.contentReference}</article>;
  }

  return <article className="content-box">External resource: {props.lesson.contentReference}</article>;
}

function InfoList(props: {
  title: string;
  items: string[];
  emptyLabel?: string;
  onSelect?: (value: string) => Promise<void>;
}) {
  return (
    <div className="info-list">
      <h3>{props.title}</h3>
      {props.items.length > 0 ? (
        <ul>
          {props.items.map((item) => (
            <li key={item}>
              {props.onSelect ? (
                <button type="button" className="text-button" onClick={() => void props.onSelect?.(item)}>
                  {item}
                </button>
              ) : (
                item
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-text">{props.emptyLabel ?? "Nothing to show yet."}</p>
      )}
    </div>
  );
}

function EmptyState(props: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{props.title}</strong>
      <p>{props.body}</p>
    </div>
  );
}




