import type { EmployeeCourse, EmployeePage } from "./types";

export type DashboardMetric = {
  label: string;
  value: number;
  description: string;
};

const primaryNavigation: Array<{ key: EmployeePage; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "assigned", label: "My Training" },
  { key: "policies", label: "Policies" },
  { key: "downloads", label: "Downloads" },
  { key: "compliance", label: "Compliance" },
  { key: "assistant", label: "Assistant" },
  { key: "profile", label: "Profile" }
];

export function getPrimaryNavigation() {
  return primaryNavigation;
}

export function buildTrainingGroups(courses: EmployeeCourse[], progress: Record<string, any>, role: string) {
  const assigned = courses.filter((course) => course.roleTargets.length === 0 || course.roleTargets.includes(role));
  const completed = assigned.filter((course) => progress[course.id]?.status === "completed");
  const inProgress = assigned.filter((course) => progress[course.id]?.status && progress[course.id]?.status !== "completed");
  return { assigned, completed, inProgress };
}

export function buildDashboardCards(
  courses: EmployeeCourse[],
  progress: Record<string, any>,
  compliance: Array<{ status?: string }>,
  acknowledgements: Array<any>,
  role: string
): DashboardMetric[] {
  const training = buildTrainingGroups(courses, progress, role);
  const overdue = compliance.filter((item) => item.status === "overdue").length;
  return [
    {
      label: "Mandatory courses",
      value: training.assigned.length,
      description: "Assigned or role-relevant learning currently in scope."
    },
    {
      label: "Completed courses",
      value: training.completed.length,
      description: "Learning items already completed and recorded."
    },
    {
      label: "Overdue items",
      value: overdue,
      description: overdue > 0 ? "Compliance items need attention." : "No overdue compliance items right now."
    },
    {
      label: "Evidence records",
      value: acknowledgements.length,
      description: "Acknowledgements and completion receipts captured so far."
    }
  ];
}

export function buildRecentActivity(
  courseDetail: { title?: string } | null,
  lesson: { title?: string } | null,
  acknowledgements: Array<{ subjectId?: string }>
): string[] {
  return [
    courseDetail?.title ? `Opened course: ${courseDetail.title}` : null,
    lesson?.title ? `Viewed lesson: ${lesson.title}` : null,
    acknowledgements[0]?.subjectId ? `Acknowledged: ${acknowledgements[0].subjectId}` : null
  ].filter(Boolean) as string[];
}

export function buildAssistantPrompts(courseTitle?: string, policyTitle?: string, hasOverdue?: boolean): string[] {
  const prompts = [
    "What mandatory training is still overdue for me?",
    "Which courses should I complete first?",
    policyTitle ? `Explain ${policyTitle}` : "Explain the leave policy",
    courseTitle ? `Summarize ${courseTitle}` : "Summarize my assigned learning"
  ];

  if (hasOverdue) {
    prompts.unshift("What should I do first to clear my overdue compliance items?");
  }

  return Array.from(new Set(prompts));
}
