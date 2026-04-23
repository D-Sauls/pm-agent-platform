import { type FormEvent, type ReactNode, useState } from "react";
import { type ThemeMode } from "./theme";
import type { EmployeeCourse, EmployeePolicy } from "./types";

export function AuthScreen(props: {
  appName: string;
  logoText: string;
  welcomeMessage: string;
  authMode: "login" | "activate";
  onChangeAuthMode: (mode: "login" | "activate") => void;
  activationToken: string;
  onActivationTokenChange: (value: string) => void;
  onActivate: (input: { token: string; password: string }) => Promise<void>;
  onLogin: (input: { username: string; password: string }) => Promise<void>;
  passwordResetUrl?: string;
  loading: boolean;
  error?: string;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activationPassword, setActivationPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showActivationPassword, setShowActivationPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    if (!username.trim()) {
      setLocalError("Enter your employee ID.");
      return;
    }
    if (password.length < 8) {
      setLocalError("Enter your password.");
      return;
    }
    await props.onLogin({ username: username.trim(), password });
  }

  async function handleActivationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    if (!props.activationToken.trim()) {
      setLocalError("Enter the activation token from your invitation.");
      return;
    }
    if (activationPassword.length < 8) {
      setLocalError("Create a password with at least 8 characters.");
      return;
    }
    if (activationPassword !== confirmPassword) {
      setLocalError("The password confirmation does not match.");
      return;
    }
    await props.onActivate({ token: props.activationToken.trim(), password: activationPassword });
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card__top">
          <div className="brand-mark">{props.logoText}</div>
          <ThemeToggle value={props.themeMode} onChange={props.onThemeModeChange} />
        </div>
        <div className="auth-copy">
          <p className="eyebrow">Employee access</p>
          <h1>{props.appName}</h1>
          <p>{props.welcomeMessage}</p>
        </div>

        <div className="segmented-control" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={props.authMode === "login" ? "segmented-control__item segmented-control__item--active" : "segmented-control__item"}
            onClick={() => props.onChangeAuthMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={props.authMode === "activate" ? "segmented-control__item segmented-control__item--active" : "segmented-control__item"}
            onClick={() => props.onChangeAuthMode("activate")}
          >
            Activate account
          </button>
        </div>

        {props.authMode === "login" ? (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <label className="field-group">
              <span>Employee ID</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" inputMode="text" />
            </label>
            <PasswordField
              label="Password"
              value={password}
              onChange={setPassword}
              reveal={showPassword}
              onToggleReveal={() => setShowPassword((current) => !current)}
              autoComplete="current-password"
            />
            <button type="submit" className="primary-button" disabled={props.loading}>
              {props.loading ? "Signing in..." : "Sign in"}
            </button>
            {props.passwordResetUrl ? (
              <a className="text-link" href={props.passwordResetUrl}>
                Reset password
              </a>
            ) : (
              <p className="helper-text">If you only received an activation link, use Activate account first.</p>
            )}
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleActivationSubmit}>
            <label className="field-group">
              <span>Activation token</span>
              <input value={props.activationToken} onChange={(event) => props.onActivationTokenChange(event.target.value)} autoComplete="off" />
            </label>
            <PasswordField
              label="Create password"
              value={activationPassword}
              onChange={setActivationPassword}
              reveal={showActivationPassword}
              onToggleReveal={() => setShowActivationPassword((current) => !current)}
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              reveal={showActivationPassword}
              onToggleReveal={() => setShowActivationPassword((current) => !current)}
              autoComplete="new-password"
            />
            <button type="submit" className="primary-button" disabled={props.loading}>
              {props.loading ? "Activating..." : "Activate and continue"}
            </button>
            <p className="helper-text">Use this once to set your first password securely. After that, sign in with your employee ID and password.</p>
          </form>
        )}

        {localError || props.error ? <p className="form-error">{localError ?? props.error}</p> : null}
      </section>
    </main>
  );
}

export function HomeTabView(props: {
  completionPercent: number;
  nextStepTitle: string;
  nextStepDescription: string;
  pendingItems: string[];
  overdueCount: number;
  readyDownloads: number;
  pendingDownloads: number;
  onContinue: () => void;
}) {
  return (
    <div className="screen-stack">
      <section className="hero-card">
        <p className="eyebrow">Your next step</p>
        <h2>{props.nextStepTitle}</h2>
        <p>{props.nextStepDescription}</p>
        <div className="progress-row">
          <strong>{props.completionPercent}% complete</strong>
          <span>{props.pendingItems.length} pending item{props.pendingItems.length === 1 ? "" : "s"}</span>
        </div>
        <ProgressBar value={props.completionPercent} />
        <button type="button" className="primary-button" onClick={props.onContinue}>
          Continue
        </button>
      </section>

      <section className="detail-card">
        <div className="section-header">
          <h3>Pending now</h3>
          {props.overdueCount > 0 ? <StatusChip status="overdue">{props.overdueCount} overdue</StatusChip> : null}
        </div>
        {props.pendingItems.length > 0 ? (
          <ul className="simple-list">
            {props.pendingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="helper-text">All assigned items are complete.</p>
        )}
      </section>

      <section className="detail-card detail-card--split">
        <div>
          <h3>Offline access</h3>
          <p>{props.readyDownloads} assigned item{props.readyDownloads === 1 ? "" : "s"} available offline.</p>
        </div>
        <div>
          <h3>Sync queue</h3>
          <p>{props.pendingDownloads} item{props.pendingDownloads === 1 ? "" : "s"} waiting for the next sync.</p>
        </div>
      </section>
    </div>
  );
}

export function TrainingListView(props: {
  courses: EmployeeCourse[];
  progress: Record<string, { progressPercent: number }>;
  resolveStatus: (course: EmployeeCourse) => "completed" | "pending" | "overdue";
  onOpenCourse: (course: EmployeeCourse) => void;
}) {
  return (
    <section className="screen-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Assigned training</p>
          <h2>Courses</h2>
        </div>
      </div>
      {props.courses.length > 0 ? (
        props.courses.map((course) => (
          <article key={course.id} className="list-card-mobile">
            <div className="list-card-mobile__header">
              <div>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
              </div>
              <StatusChip status={props.resolveStatus(course)}>{props.resolveStatus(course)}</StatusChip>
            </div>
            <ProgressBar value={props.progress[course.id]?.progressPercent ?? 0} />
            <div className="list-card-mobile__footer">
              <span>{Math.round(props.progress[course.id]?.progressPercent ?? 0)}% complete</span>
              <button type="button" className="ghost-button" onClick={() => props.onOpenCourse(course)}>
                Open course
              </button>
            </div>
          </article>
        ))
      ) : (
        <EmptyState title="No assigned courses" body="Assigned training will appear here when your onboarding path is ready." />
      )}
    </section>
  );
}

export function CourseDetailView(props: {
  course: EmployeeCourse;
  lesson: EmployeeCourse["modules"][number]["lessons"][number] | null;
  progressPercent: number;
  status: "completed" | "pending" | "overdue";
  offline: boolean;
  onBack: () => void;
  onOpenLesson: (lessonId: string) => void;
  onCompleteLesson: () => void;
}) {
  return (
    <div className="screen-stack">
      <button type="button" className="back-button" onClick={props.onBack}>
        Back to training
      </button>
      <section className="detail-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Course detail</p>
            <h2>{props.course.title}</h2>
          </div>
          <StatusChip status={props.status}>{props.status}</StatusChip>
        </div>
        <p>{props.course.description}</p>
        <ProgressBar value={props.progressPercent} />
        <p className="helper-text">{props.offline ? "Downloaded lessons remain available offline when already cached." : "Progress updates save immediately while you are online."}</p>
      </section>

      {props.course.modules.map((module) => (
        <section key={module.id} className="detail-card">
          <div className="section-header">
            <h3>{module.title}</h3>
            <span>{module.lessons.length} lesson{module.lessons.length === 1 ? "" : "s"}</span>
          </div>
          <div className="lesson-list-mobile">
            {module.lessons.map((lesson) => (
              <button key={lesson.id} type="button" className="lesson-tile" onClick={() => props.onOpenLesson(lesson.id)}>
                <span>{lesson.title}</span>
                <small>{lesson.contentType} · {lesson.estimatedDuration} min</small>
              </button>
            ))}
          </div>
        </section>
      ))}

      {props.lesson ? (
        <section className="detail-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Current lesson</p>
              <h3>{props.lesson.title}</h3>
            </div>
          </div>
          <LessonContent lesson={props.lesson} />
          <button type="button" className="primary-button" onClick={props.onCompleteLesson}>
            Mark lesson complete
          </button>
        </section>
      ) : null}
    </div>
  );
}

export function PoliciesListView(props: {
  policies: EmployeePolicy[];
  resolveStatus: (policy: EmployeePolicy) => "completed" | "pending" | "overdue";
  onOpenPolicy: (policy: EmployeePolicy) => void;
  versionLookup: (policy: EmployeePolicy) => string;
}) {
  return (
    <section className="screen-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Assigned policies</p>
          <h2>Policies</h2>
        </div>
      </div>
      {props.policies.length > 0 ? (
        props.policies.map((policy) => (
          <article key={policy.id} className="list-card-mobile">
            <div className="list-card-mobile__header">
              <div>
                <h3>{policy.title}</h3>
                <p>{policy.category}</p>
              </div>
              <StatusChip status={props.resolveStatus(policy)}>{props.resolveStatus(policy)}</StatusChip>
            </div>
            <div className="list-card-mobile__footer">
              <span>{props.versionLookup(policy)}</span>
              <button type="button" className="ghost-button" onClick={() => props.onOpenPolicy(policy)}>
                Review policy
              </button>
            </div>
          </article>
        ))
      ) : (
        <EmptyState title="No assigned policies" body="Assigned policy acknowledgements will appear here when they are required for your role." />
      )}
    </section>
  );
}

export function PolicyDetailView(props: {
  policy: EmployeePolicy;
  status: "completed" | "pending" | "overdue";
  currentVersionLabel: string;
  effectiveDate: string | null;
  changeSummary: string | null;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  onBack: () => void;
  onAcknowledge: () => void;
}) {
  return (
    <div className="screen-stack">
      <button type="button" className="back-button" onClick={props.onBack}>
        Back to policies
      </button>
      <section className="detail-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Policy acknowledgement</p>
            <h2>{props.policy.title}</h2>
          </div>
          <StatusChip status={props.status}>{props.status}</StatusChip>
        </div>
        <div className="policy-meta-grid">
          <div>
            <span>Version</span>
            <strong>{props.currentVersionLabel}</strong>
          </div>
          <div>
            <span>Effective date</span>
            <strong>{props.effectiveDate ? formatDate(props.effectiveDate) : "Current"}</strong>
          </div>
        </div>
        <p>{props.policy.category}</p>
        {props.changeSummary ? <p className="helper-text">Latest update: {props.changeSummary}</p> : null}
        <div className="acknowledgement-box">
          <strong>You are acknowledging {props.currentVersionLabel}</strong>
          <label className="checkbox-row">
            <input type="checkbox" checked={props.checked} onChange={(event) => props.onCheckedChange(event.target.checked)} />
            <span>I have reviewed this policy and understand that this acknowledgement applies to the current published version.</span>
          </label>
          <button type="button" className="primary-button" disabled={!props.checked} onClick={props.onAcknowledge}>
            Confirm acknowledgement
          </button>
        </div>
      </section>
    </div>
  );
}

export function HelpTabView(props: {
  prompts: string[];
  input: string;
  onInputChange: (value: string) => void;
  onPrompt: (prompt: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  loading: boolean;
  reply: {
    synthesizedSummary: string;
    keyFindings: string[];
    recommendedActions: string[];
    warnings: string[];
    workflowsExecuted: string[];
  } | null;
  nextStepTitle: string;
  pendingItems: string[];
}) {
  return (
    <div className="screen-stack">
      <section className="detail-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Help</p>
            <h2>Learning assistant</h2>
          </div>
        </div>
        <p>Ask about assigned courses, policies, your next step, or what still needs attention.</p>
        <div className="prompt-grid-mobile">
          {props.prompts.map((prompt) => (
            <button key={prompt} type="button" className="prompt-chip-mobile" onClick={() => props.onPrompt(prompt)}>
              {prompt}
            </button>
          ))}
        </div>
        <form className="assistant-form-mobile" onSubmit={(event) => void props.onSubmit(event)}>
          <textarea
            rows={4}
            value={props.input}
            onChange={(event) => props.onInputChange(event.target.value)}
            placeholder="Ask what to do next, explain a policy, or check your compliance status."
          />
          <button type="submit" className="primary-button" disabled={props.loading || !props.input.trim()}>
            {props.loading ? "Thinking..." : "Send"}
          </button>
        </form>
      </section>

      <section className="detail-card detail-card--split">
        <div>
          <h3>Current context</h3>
          <p>{props.nextStepTitle}</p>
        </div>
        <div>
          <h3>Pending items</h3>
          <p>{props.pendingItems.length > 0 ? props.pendingItems.join(", ") : "Nothing pending right now."}</p>
        </div>
      </section>

      {props.reply ? (
        <section className="detail-card">
          <h3>Assistant guidance</h3>
          <p>{props.reply.synthesizedSummary}</p>
          <InfoGroup title="Key findings" items={props.reply.keyFindings} />
          <InfoGroup title="Recommended actions" items={props.reply.recommendedActions} />
          <InfoGroup title="Notes" items={props.reply.warnings} emptyLabel="No additional notes." />
        </section>
      ) : (
        <EmptyState title="Ask a question" body="Start with your next step, a course question, or a policy explanation." />
      )}
    </div>
  );
}

export function ThemeToggle(props: { value: ThemeMode; onChange: (mode: ThemeMode) => void }) {
  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      {(["system", "light", "dark"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          className={props.value === mode ? "theme-toggle__item theme-toggle__item--active" : "theme-toggle__item"}
          onClick={() => props.onChange(mode)}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

export function Banner(props: { tone: "warning" | "error" | "info"; title: string; children?: ReactNode }) {
  return (
    <section className={`mobile-banner mobile-banner--${props.tone}`}>
      <strong>{props.title}</strong>
      {props.children ? <div>{props.children}</div> : null}
    </section>
  );
}

function PasswordField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  reveal: boolean;
  onToggleReveal: () => void;
  autoComplete: string;
}) {
  return (
    <label className="field-group">
      <span>{props.label}</span>
      <div className="password-field">
        <input
          type={props.reveal ? "text" : "password"}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          autoComplete={props.autoComplete}
        />
        <button type="button" className="inline-button" onClick={props.onToggleReveal}>
          {props.reveal ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}

function StatusChip(props: { status: "completed" | "pending" | "overdue"; children: ReactNode }) {
  return <span className={`status-chip-mobile status-chip-mobile--${props.status}`}>{props.children}</span>;
}

function ProgressBar(props: { value: number }) {
  return (
    <div className="progress-bar" aria-label={`${Math.round(props.value)}% complete`}>
      <span style={{ width: `${Math.max(0, Math.min(100, props.value))}%` }} />
    </div>
  );
}

function LessonContent(props: { lesson: EmployeeCourse["modules"][number]["lessons"][number] }) {
  if (props.lesson.contentType === "markdown") {
    return <article className="content-box-mobile">{props.lesson.contentReference}</article>;
  }

  if (props.lesson.contentType === "video") {
    return <article className="content-box-mobile">Video reference: {props.lesson.contentReference}</article>;
  }

  if (props.lesson.contentType === "pdf") {
    return <article className="content-box-mobile">PDF reference: {props.lesson.contentReference}</article>;
  }

  return <article className="content-box-mobile">External resource: {props.lesson.contentReference}</article>;
}

function InfoGroup(props: { title: string; items: string[]; emptyLabel?: string }) {
  return (
    <div className="info-group">
      <h4>{props.title}</h4>
      {props.items.length > 0 ? (
        <ul className="simple-list">
          {props.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="helper-text">{props.emptyLabel ?? "Nothing to show."}</p>
      )}
    </div>
  );
}

function EmptyState(props: { title: string; body: string }) {
  return (
    <section className="detail-card empty-state-mobile">
      <h3>{props.title}</h3>
      <p>{props.body}</p>
    </section>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
