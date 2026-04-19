import type { ComplianceStatus } from "./complianceModels.js";

export type HrImportFileType = "csv" | "xlsx";
export type ImportJobStatus =
  | "uploaded"
  | "validating"
  | "preview_ready"
  | "processing"
  | "completed"
  | "failed";
export type ValidationStatus = "valid" | "warning" | "invalid";
export type ProvisioningStatus = "pending" | "provisioned" | "failed" | "skipped";
export type AccountStatus = "pending_activation" | "active" | "suspended" | "deactivated";
export type ActivationMode = "activation_link" | "temporary_password";
export type UsernameMode = "employee_code" | "email";

export interface ProvisioningConfig {
  usernameMode: UsernameMode;
  activationMode: ActivationMode;
  requirePasswordResetOnFirstLogin: boolean;
  allowManualPasswordSetupByAdmin: boolean;
  duplicateEmailMode: "warning" | "error";
  missingRoleMappingMode: "warning" | "error";
  activationTtlHours: number;
}

export const defaultProvisioningConfig: ProvisioningConfig = {
  usernameMode: "employee_code",
  activationMode: "activation_link",
  requirePasswordResetOnFirstLogin: true,
  allowManualPasswordSetupByAdmin: false,
  duplicateEmailMode: "warning",
  missingRoleMappingMode: "warning",
  activationTtlHours: 72
};

export interface ProvisionedUser {
  id: string;
  tenantId: string;
  employeeCode: string;
  username: string;
  firstName: string;
  lastName: string;
  workEmail?: string | null;
  department?: string | null;
  roleName?: string | null;
  managerEmail?: string | null;
  startDate?: Date | null;
  employmentType?: string | null;
  location?: string | null;
  accountStatus: AccountStatus;
  passwordHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserImportJob {
  id: string;
  tenantId: string;
  fileName: string;
  fileType: HrImportFileType;
  uploadedBy: string;
  startedAt: Date;
  completedAt?: Date | null;
  status: ImportJobStatus;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
}

export interface UserImportRow {
  id: string;
  importJobId: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  mappedData?: Partial<ProvisionedUser> | null;
  validationStatus: ValidationStatus;
  errorMessages: string[];
  warningMessages: string[];
  provisioningStatus: ProvisioningStatus;
  createdUserId?: string | null;
}

export interface ActivationRecord {
  id: string;
  tenantId: string;
  userId: string;
  activationMode: ActivationMode;
  activationTokenHash?: string | null;
  tempPasswordHash?: string | null;
  expiresAt?: Date | null;
  activatedAt?: Date | null;
  createdAt: Date;
}

export interface ColumnMapping {
  employeeCode?: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string;
  department?: string;
  roleName?: string;
  managerEmail?: string;
  startDate?: string;
  employmentType?: string;
  location?: string;
  status?: string;
}

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Array<Record<string, unknown>>;
}

export interface RoleAssignmentOutcome {
  userId: string;
  roleMatched: boolean;
  roleProfileId?: string | null;
  onboardingPathId?: string | null;
  assignedCourseIds: string[];
  assignedPolicyIds: string[];
  complianceRequirementIds: string[];
  warnings: string[];
}

export interface ImportProcessingSummary {
  job: UserImportJob;
  provisionedUsers: ProvisionedUser[];
  failedRows: UserImportRow[];
  assignmentOutcomes: RoleAssignmentOutcome[];
}

export interface HrImportState {
  jobs: UserImportJob[];
  rows: UserImportRow[];
  users: ProvisionedUser[];
  activationRecords: ActivationRecord[];
  auditEvents: Array<{
    id: string;
    tenantId: string;
    importJobId?: string;
    action: string;
    details?: Record<string, unknown>;
    createdAt: Date;
  }>;
  assignments: RoleAssignmentOutcome[];
  complianceStatuses: ComplianceStatus[];
}
