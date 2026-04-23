export interface AssistantDemoResponse {
  synthesizedSummary: string;
  keyFindings: string[];
  recommendedActions: string[];
  warnings: string[];
  workflowsExecuted: string[];
}

export interface AssistantDemoResult {
  goalType: AssistantIntentId;
  response: AssistantDemoResponse;
}

type AssistantIntentId =
  | "next_training_step_demo"
  | "role_context_demo"
  | "course_duration_demo"
  | "assignment_scope_demo"
  | "compliance_audit_demo"
  | "knowledge_lookup_demo"
  | "onboarding_recommendation_demo"
  | "assistant_guidance_demo";

type AssistantIntent = {
  id: AssistantIntentId;
  priority: number;
  matches: (text: string) => boolean;
};

export const assistantDemoPrompts = [
  "What should I do next?",
  "Do I need to complete every course?",
  "What am I missing for compliance?",
  "What is my role and why am I doing this training?",
  "Explain Food Safety Policy v4",
  "Summarize my onboarding path"
];

const demoNotice = "Smart demo mode. Live AI answers require a valid employee session and backend assistant response.";

export const defaultAssistantDemoResponse: AssistantDemoResponse = {
  synthesizedSummary:
    "Demo guidance: your next best action is to complete Kitchen Hygiene Lesson 3, then acknowledge Food Safety Policy v4. You are 68% through the sample onboarding path.",
  keyFindings: [
    "Kitchen Hygiene Lesson 3 is the next required learning task.",
    "Food Safety Policy v4 still needs an explicit acknowledgement.",
    "The sample user has one compliance item due tomorrow and no blocked tasks."
  ],
  recommendedActions: [
    "Open Kitchen Hygiene Lesson 3 and mark it complete after reviewing the content.",
    "Read Food Safety Policy v4 and confirm the acknowledgement checkbox.",
    "Ask the assistant to explain the policy before acknowledging if anything is unclear."
  ],
  warnings: [demoNotice],
  workflowsExecuted: ["next_training_step_demo", "compliance_status_demo"]
};

const replacements: Array<[RegExp, string]> = [
  [/\bcourese\b/g, "course"],
  [/\bcoureses\b/g, "courses"],
  [/\bcource\b/g, "course"],
  [/\bcources\b/g, "courses"],
  [/\bcorse\b/g, "course"],
  [/\bcorses\b/g, "courses"],
  [/\bcompliace\b/g, "compliance"],
  [/\bcomplaince\b/g, "compliance"],
  [/\backnowlede\b/g, "acknowledge"],
  [/\backnowlegde\b/g, "acknowledge"],
  [/\btraning\b/g, "training"],
  [/\bcomplere\b/g, "complete"],
  [/\bcompletr\b/g, "complete"],
  [/\bcomplet\b/g, "complete"]
];

const phrases = {
  nextStep: ["what should i do next", "what do i do next", "what is next", "whats next", "next in", "next task", "next step", "complete next", "finish next", "do first", "complete first"],
  rolePurpose: ["job role", "my role", "purpose", "why am i", "why do i", "doing these course", "doing these courses"],
  duration: ["quick", "quicker", "quickest", "fast", "faster", "fastest", "short", "shorter", "shortest", "easier", "easy", "less time", "least time", "how long", "duration", "time to complete"],
  courseScope: ["all these course", "all these courses", "all the course", "all courses", "every course", "do all", "should i do", "need to complete every", "which courses do i actually", "which courses should i actually", "these course", "these courses", "about these course", "about these courses"],
  courseScopeSignals: ["what do you think", "do you think", "should", "need to", "all", "every", "required"],
  compliance: ["missing", "compliance", "overdue", "not complete", "outstanding", "gap", "gaps", "not compliant", "non compliant"],
  policyExplain: ["policy", "explain", "what does", "meaning of"],
  onboarding: ["onboarding", "path", "summarize", "journey", "training plan"],
  learningTopic: ["course", "courses", "training", "lesson", "lessons", "learning"]
} as const;

const intentOrder: AssistantIntent[] = [
  { id: "next_training_step_demo", priority: 100, matches: (text: string) => hasAny(text, phrases.nextStep) },
  { id: "role_context_demo", priority: 90, matches: (text: string) => hasAny(text, phrases.rolePurpose) },
  { id: "course_duration_demo", priority: 80, matches: (text: string) => hasLearningTopic(text) && hasAny(text, phrases.duration) },
  {
    id: "assignment_scope_demo",
    priority: 70,
    matches: (text: string) => hasAny(text, phrases.courseScope) || (hasLearningTopic(text) && hasAny(text, phrases.courseScopeSignals))
  },
  { id: "compliance_audit_demo", priority: 60, matches: (text: string) => hasAny(text, phrases.compliance) },
  { id: "knowledge_lookup_demo", priority: 50, matches: (text: string) => hasAny(text, phrases.policyExplain) },
  { id: "onboarding_recommendation_demo", priority: 40, matches: (text: string) => hasAny(text, phrases.onboarding) }
];

const responseByIntent: Record<AssistantIntentId, (warning: string) => AssistantDemoResult> = {
  next_training_step_demo: (warning) => ({
    goalType: "next_training_step_demo",
    response: { ...defaultAssistantDemoResponse, warnings: [warning] }
  }),

  role_context_demo: (warning) => ({
    goalType: "role_context_demo",
    response: {
      synthesizedSummary:
        "Your sample role is Kitchen Trainer. The purpose of these courses is to make sure you can safely train new restaurant staff, explain core hygiene rules, and prove that required policies were acknowledged.",
      keyFindings: [
        "The training is connected to your role, not random course content.",
        "Food safety and hygiene lessons prepare you to coach staff consistently.",
        "Policy acknowledgements create auditable evidence that you accepted the current rules."
      ],
      recommendedActions: [
        "Complete the next assigned hygiene lesson first.",
        "Use the policy explanation prompt before acknowledging Food Safety Policy v4.",
        "Check your Compliance page after each task to confirm the platform recorded your progress."
      ],
      warnings: [warning],
      workflowsExecuted: ["role_knowledge_lookup_demo", "onboarding_recommendation_demo"]
    }
  }),

  course_duration_demo: (warning) => ({
    goalType: "course_duration_demo",
    response: {
      synthesizedSummary:
        "The quickest required learning item in this demo is Kitchen Hygiene Lesson 3 because it is a single lesson in the current path. Food Safety Policy v4 may be faster to acknowledge, but it is a policy action, not a course, and you still need to read it before confirming.",
      keyFindings: [
        "Fastest required course/lesson: Kitchen Hygiene Lesson 3.",
        "Fastest compliance action: Food Safety Policy v4 acknowledgement, after reading it.",
        "Speed should not replace priority: overdue or required items should come before optional content."
      ],
      recommendedActions: [
        "If you want the quickest course progress, complete Kitchen Hygiene Lesson 3 first.",
        "If you want to clear compliance risk, read and acknowledge Food Safety Policy v4 next.",
        "Do not spend time on optional courses until assigned items are complete."
      ],
      warnings: [warning],
      workflowsExecuted: ["course_duration_demo", "next_training_step_demo", "compliance_status_demo"]
    }
  }),

  assignment_scope_demo: (warning) => ({
    goalType: "assignment_scope_demo",
    response: {
      synthesizedSummary:
        "These courses are useful when they are assigned to your role or onboarding path, but you should not treat every course in the platform as required. In this demo, focus on the required lesson and policy first; optional or unrelated courses can wait unless your manager assigns them.",
      keyFindings: [
        "Required now: Kitchen Hygiene Lesson 3.",
        "Required next: Food Safety Policy v4 acknowledgement.",
        "Optional catalogue items are not the same as compliance requirements."
      ],
      recommendedActions: [
        "Complete the current required lesson first.",
        "Acknowledge the current policy version after reading it.",
        "Ignore optional courses until they appear in your assigned path or your manager tells you to complete them."
      ],
      warnings: [warning],
      workflowsExecuted: ["assignment_scope_demo", "next_training_step_demo", "compliance_status_demo"]
    }
  }),

  compliance_audit_demo: (warning) => ({
    goalType: "compliance_audit_demo",
    response: {
      synthesizedSummary:
        "The sample employee is missing one policy acknowledgement and one lesson completion. There are no failed quiz attempts in the demo data.",
      keyFindings: [
        "Food Safety Policy v4 is pending acknowledgement.",
        "Kitchen Hygiene Lesson 3 is still incomplete.",
        "The sample compliance due date is tomorrow, so this should be handled before other optional learning."
      ],
      recommendedActions: [
        "Complete Kitchen Hygiene Lesson 3 first.",
        "Acknowledge Food Safety Policy v4 after reading it.",
        "Return to the status page to confirm both items are no longer pending."
      ],
      warnings: [warning],
      workflowsExecuted: ["compliance_audit_demo", "requirement_status_demo"]
    }
  }),

  knowledge_lookup_demo: (warning) => ({
    goalType: "knowledge_lookup_demo",
    response: {
      synthesizedSummary:
        "Food Safety Policy v4 explains how staff should handle hygiene, food storage, and contamination prevention. The important point is that acknowledging the policy means you accept the current published version, not an older copy.",
      keyFindings: [
        "Version v4 is the active policy version in this demo scenario.",
        "The effective date is treated as the compliance reference date.",
        "Acknowledgement evidence should be created by the server and tied to the exact policy version."
      ],
      recommendedActions: [
        "Review the policy content before confirming.",
        "Check the version label before acknowledging.",
        "Use the acknowledgement receipt as proof that the current version was accepted."
      ],
      warnings: [warning],
      workflowsExecuted: ["policy_lookup_demo", "knowledge_explain_demo"]
    }
  }),

  onboarding_recommendation_demo: (warning) => ({
    goalType: "onboarding_recommendation_demo",
    response: {
      synthesizedSummary:
        "Your demo onboarding path is a short restaurant readiness flow: safety basics, hygiene procedures, policy acknowledgement, then a final quiz.",
      keyFindings: [
        "Completed: Welcome Video and Food Safety Basics.",
        "Current: Kitchen Hygiene Lesson 3.",
        "Next: Food Safety Policy v4 acknowledgement, then Final Quiz."
      ],
      recommendedActions: [
        "Continue the current lesson from the My Training section.",
        "Use the policy screen for the explicit acknowledgement step.",
        "Ask 'what am I missing?' after each task to refresh the guidance."
      ],
      warnings: [warning],
      workflowsExecuted: ["onboarding_recommendation_demo", "learning_progress_demo"]
    }
  }),

  assistant_guidance_demo: (warning) => ({
    goalType: "assistant_guidance_demo",
    response: {
      synthesizedSummary:
        "I can help with onboarding, assigned courses, policies, role purpose, and compliance status. Ask what to do next, whether a course is required, what a policy means, or what you are missing.",
      keyFindings: [
        "This demo assistant is intentionally limited to onboarding and compliance topics.",
        "For unclear questions, it should ask you to narrow the question instead of pretending to know.",
        "Live AI mode requires a real activated employee session."
      ],
      recommendedActions: [
        "Ask 'what should I do next?' for the next required task.",
        "Ask 'do I need to complete every course?' to understand assigned versus optional training.",
        "Ask 'what am I missing for compliance?' to review outstanding items."
      ],
      warnings: [warning],
      workflowsExecuted: ["assistant_guidance_demo"]
    }
  })
};

export function normalizeAssistantMessage(message: string): string {
  const text = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return replacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

export function getAssistantDemoResult(message: string, fallbackUsed = false): AssistantDemoResult {
  const text = normalizeAssistantMessage(message);
  const warning = fallbackUsed ? "Live assistant was unavailable, so this response is using safe demo data." : demoNotice;
  const intent = intentOrder.find((candidate) => candidate.matches(text))?.id ?? "assistant_guidance_demo";
  return responseByIntent[intent](warning);
}

function hasAny(text: string, values: readonly string[]): boolean {
  return values.some((value) => text.includes(value));
}

function hasLearningTopic(text: string): boolean {
  return hasAny(text, phrases.learningTopic);
}
