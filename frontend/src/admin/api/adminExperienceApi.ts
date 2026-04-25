import { getAdminJson, patchAdminJson, postAdminJson } from "../../api/adminClient";

export const ADMIN_TENANT_ID = "tenant-acme";

export type AdminComplianceStatus = "compliant" | "pending" | "overdue" | "non_compliant";
export type AdminTone = "neutral" | "success" | "warning" | "danger";
export type AdminContentStatus = "active" | "draft" | "retired";
export type AdminImportStatus = "valid" | "warning" | "invalid";

export interface AdminEmployeeSummary {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  role: string;
  complianceStatus: AdminComplianceStatus;
  overdueItems: number;
  onboardingProgress: number;
  lastActivity: string | null;
  nextAction: string;
  accountStatus?: string;
}

export interface AdminEmployeeDetail extends AdminEmployeeSummary {
  assignedCourses: Array<{ id: string; title: string; status: "completed" | "pending" | "overdue"; progress: number; version: string }>;
  assignedPolicies: Array<{ id: string; title: string; version: string; status: "acknowledged" | "pending" | "overdue"; effectiveDate: string | null }>;
  acknowledgementTimeline: Array<{ id: string; date: string | null; title: string; version: string; event: string; actor: string; readOnly: boolean }>;
  auditLog: Array<{ id: string; date: string | null; event: string; actor: string; reason?: string }>;
}

export interface AdminDashboardResponse {
  tenantId: string;
  kpis: {
    totalEmployees: number;
    compliantEmployees: number;
    nonCompliantEmployees: number;
    overdueUsers: number;
    onboardingCompletion: number;
  };
  atRisk: AdminEmployeeSummary[];
  recentActivity: Array<{ id: string; date: string | null; title: string; detail: string; tone: AdminTone }>;
  actionRequired: Array<{ id: string; title: string; detail: string; owner: string; urgency: "normal" | "high" | "critical" }>;
}

export interface AdminEmployeesResponse {
  tenantId: string;
  employees: AdminEmployeeSummary[];
}

export interface AdminEmployeeDetailResponse {
  tenantId: string;
  employee: AdminEmployeeDetail;
}

export interface AdminContentResponse {
  tenantId: string;
  policies: Array<{
    id: string;
    title: string;
    activeVersion: string;
    effectiveDate: string | null;
    status: AdminContentStatus;
    acknowledgedCount: number;
    assignedCount: number;
    reackImpact: number;
    versions: Array<{ id: string; version: string; status: AdminContentStatus; publishedAt: string | null; acknowledgedCount: number }>;
  }>;
  courses: Array<{
    id: string;
    title: string;
    activeVersion: string;
    status: AdminContentStatus;
    assignedCount: number;
    completionRate: number;
    updatedAt: string | null;
    versions: Array<{ id: string; version: string; status: AdminContentStatus; updatedAt: string | null; completionRate: number }>;
  }>;
}

export interface AdminTenantSettings {
  tenantId: string;
  tenantName: string;
  appName: string;
  brandColor: string;
  activationMode: string;
  downloadPolicy: "allow_anywhere" | "authenticated_only" | "vpn_only" | "office_ip_only";
  accessPolicy: string;
  evidenceRetention: string;
  complianceDueDays: number;
  allowedIpRanges: string[];
}

export interface HrImportJob {
  id: string;
  tenantId: string;
  fileName: string;
  fileType: "csv" | "xlsx";
  uploadedBy: string;
  startedAt: string;
  completedAt?: string | null;
  status: "uploaded" | "validating" | "preview_ready" | "processing" | "completed" | "failed";
  totalRows: number;
  successfulRows: number;
  failedRows: number;
}

export interface HrImportRow {
  id: string;
  importJobId: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  mappedData?: Record<string, unknown> | null;
  validationStatus: AdminImportStatus;
  errorMessages: string[];
  warningMessages: string[];
  provisioningStatus: "pending" | "provisioned" | "failed" | "skipped";
  createdUserId?: string | null;
}

export interface HrImportPreviewResponse {
  job: HrImportJob;
  rows: HrImportRow[];
}

function withTenant(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}tenantId=${encodeURIComponent(ADMIN_TENANT_ID)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

export function formatAdminDate(value: string | null | undefined) {
  return formatDate(value);
}

export function getStatusLabel(status: string) {
  if (status === "non_compliant") return "Non-compliant";
  return status.replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
}

export function getStatusTone(status: string): AdminTone {
  if (["compliant", "completed", "acknowledged", "active", "valid", "provisioned"].includes(status)) return "success";
  if (["pending", "warning", "draft", "processing", "preview_ready", "uploaded"].includes(status)) return "warning";
  if (["overdue", "non_compliant", "invalid", "failed", "skipped"].includes(status)) return "danger";
  return "neutral";
}

export async function loadAdminDashboard() {
  return getAdminJson<AdminDashboardResponse>(withTenant("/experience/dashboard"));
}

export async function loadAdminEmployees() {
  return getAdminJson<AdminEmployeesResponse>(withTenant("/experience/employees"));
}

export async function loadAdminEmployeeDetail(employeeId: string) {
  return getAdminJson<AdminEmployeeDetailResponse>(withTenant(`/experience/employees/${employeeId}`));
}

export async function createAdminOverride(employeeId: string, body: { subjectType: "policy" | "course" | "lesson"; subjectId: string; subjectVersionId?: string | null; reason: string }) {
  return postAdminJson<AdminEmployeeDetailResponse>(`/experience/employees/${employeeId}/overrides`, {
    ...body,
    tenantId: ADMIN_TENANT_ID
  });
}

export async function loadAdminContent() {
  return getAdminJson<AdminContentResponse>(withTenant("/experience/content"));
}

export async function publishPolicyVersion(policyId: string, versionLabel: string) {
  return postAdminJson<AdminContentResponse>(`/experience/policies/${policyId}/versions`, {
    tenantId: ADMIN_TENANT_ID,
    versionLabel,
    changeSummary: "Published from admin content management."
  });
}

export async function publishCourseVersion(courseId: string, versionLabel: string) {
  return postAdminJson<AdminContentResponse>(`/experience/courses/${courseId}/versions`, {
    tenantId: ADMIN_TENANT_ID,
    versionLabel,
    changeSummary: "Published from admin content management."
  });
}

export async function loadTenantSettings() {
  return getAdminJson<AdminTenantSettings>(withTenant("/experience/settings"));
}

export async function saveTenantSettings(settings: Partial<AdminTenantSettings>) {
  return patchAdminJson<AdminTenantSettings>("/experience/settings", {
    ...settings,
    tenantId: ADMIN_TENANT_ID
  });
}

export async function listHrImportJobs() {
  return getAdminJson<{ jobs: HrImportJob[] }>(withTenant("/hr-import/jobs"));
}

export async function loadHrImportPreview(jobId: string) {
  return postAdminJson<HrImportPreviewResponse>(`/hr-import/jobs/${jobId}/preview`, { tenantId: ADMIN_TENANT_ID });
}

export async function processHrImportJob(jobId: string) {
  return postAdminJson<HrImportPreviewResponse & { provisionedUsers?: unknown[]; failedRows?: HrImportRow[] }>(`/hr-import/jobs/${jobId}/process`, { tenantId: ADMIN_TENANT_ID });
}

export async function uploadHrImportFile(file: File) {
  const fileContentBase64 = await fileToBase64(file);
  return postAdminJson<HrImportPreviewResponse>("/hr-import/jobs", {
    tenantId: ADMIN_TENANT_ID,
    fileName: file.name,
    fileType: file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv",
    fileContentBase64
  });
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}
