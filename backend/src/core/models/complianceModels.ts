export type ComplianceSubjectType = "policy" | "course" | "lesson";
export type AcknowledgementType = "opened" | "completed" | "accepted" | "signed" | "hr_override";
export type AcknowledgementStatus = "pending" | "completed" | "invalidated";
export type ComplianceRequirementType = "policy" | "course";
export type ComplianceState = "assigned" | "in_progress" | "completed" | "overdue" | "exempted";
export type ReadReceiptMode =
  | "none"
  | "open_tracking"
  | "acceptance_tracking"
  | "signature_tracking";
export type DownloadPolicy = "allow_anywhere" | "authenticated_only" | "vpn_only" | "office_ip_only";

export interface PolicyVersion {
  id: string;
  policyId: string;
  tenantId: string;
  versionLabel: string;
  documentReference: string;
  effectiveDate: Date;
  publishedBy?: string | null;
  publishedAt?: Date | null;
  isCurrent: boolean;
  changeSummary?: string | null;
}

export interface CourseVersion {
  id: string;
  courseId: string;
  tenantId: string;
  versionLabel: string;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  isCurrent: boolean;
  changeSummary?: string | null;
}

export interface AcknowledgementRecord {
  id: string;
  tenantId: string;
  userId: string;
  subjectType: ComplianceSubjectType;
  subjectId: string;
  subjectVersionId?: string | null;
  acknowledgementType: AcknowledgementType;
  status: AcknowledgementStatus;
  actorId?: string | null;
  actorRole?: string | null;
  recordedAt: Date;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  notes?: string | null;
}

export interface ComplianceRequirement {
  id: string;
  tenantId: string;
  requirementType: ComplianceRequirementType;
  requirementId: string;
  appliesToRoles: string[];
  appliesToDepartments?: string[];
  mandatory: boolean;
  dueInDays?: number | null;
  refresherPeriodDays?: number | null;
  acknowledgementRequired: boolean;
  signatureRequired: boolean;
}

export interface ComplianceStatus {
  tenantId: string;
  userId: string;
  requirementId: string;
  status: ComplianceState;
  assignedAt?: Date | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  lastAcknowledgementId?: string | null;
}

export interface HROverrideRecord {
  id: string;
  tenantId: string;
  userId: string;
  subjectType: ComplianceSubjectType;
  subjectId: string;
  subjectVersionId?: string | null;
  overriddenBy: string;
  reason: string;
  recordedAt: Date;
}

export interface ComplianceConfig {
  acknowledgementRequiredDefault: boolean;
  signatureRequiredDefault: boolean;
  hrOverrideEnabled: boolean;
  refresherEnabled: boolean;
  defaultRefresherPeriodDays?: number | null;
  readReceiptMode: ReadReceiptMode;
  downloadPolicy: DownloadPolicy;
  allowedIpRanges?: string[];
}

export interface ComplianceAuditResult {
  workflowId: "compliance_audit";
  resultType: "compliance_audit";
  userId?: string;
  overallStatus: "compliant" | "at_risk" | "non_compliant";
  overdueItems: ComplianceStatus[];
  outstandingAcknowledgements: AcknowledgementRecord[];
  summary: string;
  generatedAt: Date;
  warnings: string[];
}

export interface RequirementStatusResult {
  workflowId: "requirement_status";
  resultType: "requirement_status";
  userId: string;
  statuses: ComplianceStatus[];
  generatedAt: Date;
  warnings: string[];
}
