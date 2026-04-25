export type AdminComplianceStatus = "compliant" | "pending" | "overdue" | "non_compliant";
export type AdminContentStatus = "active" | "draft" | "retired";
export type AdminImportStatus = "ready" | "warning" | "error" | "duplicate";

export interface AdminEmployeeRecord {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  role: string;
  complianceStatus: AdminComplianceStatus;
  overdueItems: number;
  onboardingProgress: number;
  lastActivity: string;
  nextAction: string;
  assignedCourses: Array<{ title: string; status: "completed" | "pending" | "overdue"; progress: number }>;
  assignedPolicies: Array<{ title: string; version: string; status: "acknowledged" | "pending" | "overdue"; effectiveDate: string }>;
  acknowledgementTimeline: Array<{ date: string; title: string; version: string; event: string; actor: string }>;
  auditLog: Array<{ date: string; event: string; actor: string; reason?: string }>;
}

export interface AdminActivityItem {
  id: string;
  date: string;
  title: string;
  detail: string;
  tone: "neutral" | "success" | "warning" | "danger";
}

export interface AdminActionItem {
  id: string;
  title: string;
  detail: string;
  owner: string;
  urgency: "normal" | "high" | "critical";
}

export interface AdminPolicyRecord {
  id: string;
  title: string;
  activeVersion: string;
  effectiveDate: string;
  status: AdminContentStatus;
  acknowledgedCount: number;
  assignedCount: number;
  reackImpact: number;
  versions: Array<{ version: string; status: AdminContentStatus; publishedAt: string; acknowledgedCount: number }>;
}

export interface AdminCourseRecord {
  id: string;
  title: string;
  activeVersion: string;
  status: AdminContentStatus;
  assignedCount: number;
  completionRate: number;
  updatedAt: string;
  versions: Array<{ version: string; status: AdminContentStatus; updatedAt: string; completionRate: number }>;
}

export interface AdminImportPreviewRow {
  row: number;
  employeeCode: string;
  name: string;
  department: string;
  role: string;
  status: AdminImportStatus;
  message: string;
}

export const adminEmployees: AdminEmployeeRecord[] = [
  {
    id: "emp-001",
    employeeCode: "EMP-1045",
    name: "Maya Ndlovu",
    department: "Kitchen",
    role: "Line Cook",
    complianceStatus: "overdue",
    overdueItems: 2,
    onboardingProgress: 62,
    lastActivity: "Today, 08:41",
    nextAction: "Acknowledge Food Safety Policy v4",
    assignedCourses: [
      { title: "Kitchen Hygiene Basics", status: "pending", progress: 70 },
      { title: "Allergen Handling", status: "overdue", progress: 35 },
      { title: "Opening Shift Checklist", status: "completed", progress: 100 }
    ],
    assignedPolicies: [
      { title: "Food Safety Policy", version: "v4", status: "overdue", effectiveDate: "2026-04-01" },
      { title: "Knife Safety Standard", version: "v2", status: "pending", effectiveDate: "2026-03-15" }
    ],
    acknowledgementTimeline: [
      { date: "2026-04-22 09:12", title: "Opening Shift Checklist", version: "v1", event: "Course completed", actor: "Maya Ndlovu" },
      { date: "2026-04-18 14:07", title: "Food Safety Policy", version: "v3", event: "Acknowledged previous version", actor: "Maya Ndlovu" },
      { date: "2026-04-01 07:00", title: "Food Safety Policy", version: "v4", event: "Re-acknowledgement required", actor: "System" }
    ],
    auditLog: [
      { date: "2026-04-01 07:00", event: "Policy version changed; user moved to pending acknowledgement", actor: "System" },
      { date: "2026-04-20 11:15", event: "Reminder sent", actor: "Compliance Admin" }
    ]
  },
  {
    id: "emp-002",
    employeeCode: "EMP-1092",
    name: "Caleb Adams",
    department: "Front of House",
    role: "Server",
    complianceStatus: "pending",
    overdueItems: 0,
    onboardingProgress: 74,
    lastActivity: "Yesterday, 16:22",
    nextAction: "Complete Guest Safety module",
    assignedCourses: [
      { title: "Guest Safety", status: "pending", progress: 55 },
      { title: "POS Basics", status: "completed", progress: 100 }
    ],
    assignedPolicies: [
      { title: "Cash Handling Policy", version: "v2", status: "acknowledged", effectiveDate: "2026-02-20" },
      { title: "Guest Conduct Policy", version: "v1", status: "pending", effectiveDate: "2026-04-10" }
    ],
    acknowledgementTimeline: [
      { date: "2026-04-23 12:20", title: "Cash Handling Policy", version: "v2", event: "Acknowledged", actor: "Caleb Adams" },
      { date: "2026-04-21 15:02", title: "POS Basics", version: "v1", event: "Course completed", actor: "Caleb Adams" }
    ],
    auditLog: [{ date: "2026-04-21 09:00", event: "Assigned onboarding path Server Starter", actor: "System" }]
  },
  {
    id: "emp-003",
    employeeCode: "EMP-1120",
    name: "Priya Singh",
    department: "Management",
    role: "Shift Lead",
    complianceStatus: "compliant",
    overdueItems: 0,
    onboardingProgress: 100,
    lastActivity: "Today, 10:10",
    nextAction: "No required action",
    assignedCourses: [
      { title: "Incident Response", status: "completed", progress: 100 },
      { title: "Manager Opening Duties", status: "completed", progress: 100 }
    ],
    assignedPolicies: [
      { title: "Manager Escalation Policy", version: "v3", status: "acknowledged", effectiveDate: "2026-03-01" }
    ],
    acknowledgementTimeline: [
      { date: "2026-04-24 10:10", title: "Manager Escalation Policy", version: "v3", event: "Acknowledged", actor: "Priya Singh" },
      { date: "2026-04-22 17:30", title: "Incident Response", version: "v2", event: "Course completed", actor: "Priya Singh" }
    ],
    auditLog: [{ date: "2026-04-24 10:10", event: "Compliance status changed to compliant", actor: "System" }]
  },
  {
    id: "emp-004",
    employeeCode: "EMP-1188",
    name: "Jonas Meyer",
    department: "Kitchen",
    role: "Prep Cook",
    complianceStatus: "non_compliant",
    overdueItems: 3,
    onboardingProgress: 28,
    lastActivity: "Apr 19, 2026",
    nextAction: "Complete required onboarding restart review",
    assignedCourses: [
      { title: "Kitchen Hygiene Basics", status: "overdue", progress: 20 },
      { title: "Cold Chain Handling", status: "overdue", progress: 0 }
    ],
    assignedPolicies: [
      { title: "Food Safety Policy", version: "v4", status: "overdue", effectiveDate: "2026-04-01" }
    ],
    acknowledgementTimeline: [
      { date: "2026-04-01 07:00", title: "Food Safety Policy", version: "v4", event: "Acknowledgement assigned", actor: "System" }
    ],
    auditLog: [
      { date: "2026-04-01 07:00", event: "Policy assigned", actor: "System" },
      { date: "2026-04-19 18:00", event: "Escalation triggered after missed due date", actor: "System" }
    ]
  }
];

export const adminActivity: AdminActivityItem[] = [
  { id: "act-1", date: "Today, 10:10", title: "Acknowledgement captured", detail: "Priya Singh acknowledged Manager Escalation Policy v3.", tone: "success" },
  { id: "act-2", date: "Today, 08:41", title: "Progress updated", detail: "Maya Ndlovu reached 62% onboarding completion.", tone: "neutral" },
  { id: "act-3", date: "Yesterday, 16:22", title: "Policy pending", detail: "Caleb Adams has one pending policy acknowledgement.", tone: "warning" },
  { id: "act-4", date: "Apr 19, 2026", title: "Compliance escalation", detail: "Jonas Meyer became non-compliant after missed due dates.", tone: "danger" }
];

export const adminActions: AdminActionItem[] = [
  { id: "action-1", title: "Review overdue kitchen onboarding", detail: "Two kitchen users have overdue required items.", owner: "Compliance", urgency: "critical" },
  { id: "action-2", title: "Confirm HR import duplicate handling", detail: "One duplicate employee code requires admin confirmation.", owner: "HR", urgency: "high" },
  { id: "action-3", title: "Publish policy update intentionally", detail: "Food Safety Policy v5 draft affects 42 employees.", owner: "Compliance", urgency: "normal" }
];

export const importPreviewRows: AdminImportPreviewRow[] = [
  { row: 2, employeeCode: "EMP-1191", name: "Nora Blake", department: "Kitchen", role: "Prep Cook", status: "ready", message: "Ready to provision and assign Kitchen Starter path." },
  { row: 3, employeeCode: "EMP-1092", name: "Caleb Adams", department: "Front of House", role: "Server", status: "duplicate", message: "Duplicate employee ID detected; existing employee will be updated only after confirmation." },
  { row: 4, employeeCode: "EMP-1203", name: "Luis Grant", department: "Bar", role: "Bartender", status: "warning", message: "Role mapping found, but manager email is missing." },
  { row: 5, employeeCode: "", name: "Ava Chen", department: "Kitchen", role: "Line Cook", status: "error", message: "Employee ID is required before processing." }
];

export const policies: AdminPolicyRecord[] = [
  {
    id: "policy-food-safety",
    title: "Food Safety Policy",
    activeVersion: "v4",
    effectiveDate: "2026-04-01",
    status: "active",
    acknowledgedCount: 36,
    assignedCount: 42,
    reackImpact: 42,
    versions: [
      { version: "v5 draft", status: "draft", publishedAt: "Not published", acknowledgedCount: 0 },
      { version: "v4", status: "active", publishedAt: "2026-04-01", acknowledgedCount: 36 },
      { version: "v3", status: "retired", publishedAt: "2025-12-12", acknowledgedCount: 41 }
    ]
  },
  {
    id: "policy-cash-handling",
    title: "Cash Handling Policy",
    activeVersion: "v2",
    effectiveDate: "2026-02-20",
    status: "active",
    acknowledgedCount: 27,
    assignedCount: 29,
    reackImpact: 0,
    versions: [
      { version: "v2", status: "active", publishedAt: "2026-02-20", acknowledgedCount: 27 },
      { version: "v1", status: "retired", publishedAt: "2025-09-04", acknowledgedCount: 31 }
    ]
  }
];

export const courses: AdminCourseRecord[] = [
  {
    id: "course-kitchen-hygiene",
    title: "Kitchen Hygiene Basics",
    activeVersion: "v3",
    status: "active",
    assignedCount: 42,
    completionRate: 76,
    updatedAt: "2026-04-12",
    versions: [
      { version: "v3", status: "active", updatedAt: "2026-04-12", completionRate: 76 },
      { version: "v2", status: "retired", updatedAt: "2026-01-18", completionRate: 88 }
    ]
  },
  {
    id: "course-guest-safety",
    title: "Guest Safety",
    activeVersion: "v1",
    status: "active",
    assignedCount: 29,
    completionRate: 64,
    updatedAt: "2026-03-25",
    versions: [{ version: "v1", status: "active", updatedAt: "2026-03-25", completionRate: 64 }]
  }
];

export const tenantSettings = {
  tenantName: "Acme Restaurant Group",
  brandColor: "#1d3557",
  appName: "Acme Learning Hub",
  activationMode: "Activation link",
  downloadPolicy: "Authenticated users only",
  accessPolicy: "Employee session required",
  evidenceRetention: "7 years",
  complianceDueDays: 14
};

export function getEmployeeById(employeeId: string) {
  return adminEmployees.find((employee) => employee.id === employeeId) ?? adminEmployees[0];
}

export function getStatusLabel(status: AdminComplianceStatus) {
  if (status === "non_compliant") return "Non-compliant";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getStatusTone(status: AdminComplianceStatus | AdminImportStatus | AdminContentStatus | string) {
  if (["compliant", "ready", "active"].includes(status)) return "success";
  if (["pending", "warning", "draft"].includes(status)) return "warning";
  if (["overdue", "non_compliant", "error", "duplicate"].includes(status)) return "danger";
  return "neutral";
}
