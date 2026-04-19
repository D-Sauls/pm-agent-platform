import fs from "node:fs";
import path from "node:path";
import type {
  ActivationRecord,
  HrImportState,
  ImportJobStatus,
  ProvisionedUser,
  RoleAssignmentOutcome,
  UserImportJob,
  UserImportRow
} from "../../models/hrImportModels.js";
import type { ComplianceStatus } from "../../models/complianceModels.js";

const emptyState = (): HrImportState => ({
  jobs: [],
  rows: [],
  users: [],
  activationRecords: [],
  auditEvents: [],
  assignments: [],
  complianceStatuses: []
});

function reviveDates(state: HrImportState): HrImportState {
  return {
    ...state,
    jobs: state.jobs.map((job) => ({
      ...job,
      startedAt: new Date(job.startedAt),
      completedAt: job.completedAt ? new Date(job.completedAt) : null
    })),
    users: state.users.map((user) => ({
      ...user,
      startDate: user.startDate ? new Date(user.startDate) : null,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt)
    })),
    activationRecords: state.activationRecords.map((record) => ({
      ...record,
      expiresAt: record.expiresAt ? new Date(record.expiresAt) : null,
      activatedAt: record.activatedAt ? new Date(record.activatedAt) : null,
      createdAt: new Date(record.createdAt)
    })),
    auditEvents: state.auditEvents.map((event) => ({
      ...event,
      createdAt: new Date(event.createdAt)
    })),
    complianceStatuses: (state.complianceStatuses ?? []).map((status) => ({
      ...status,
      assignedAt: status.assignedAt ? new Date(status.assignedAt) : null,
      dueDate: status.dueDate ? new Date(status.dueDate) : null,
      completedAt: status.completedAt ? new Date(status.completedAt) : null
    }))
  };
}

export class FileHrImportRepository {
  constructor(private readonly filePath: string) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      this.write(emptyState());
    }
  }

  private read(): HrImportState {
    const raw = fs.readFileSync(this.filePath, "utf8");
    return reviveDates({ ...emptyState(), ...JSON.parse(raw) } as HrImportState);
  }

  private write(state: HrImportState): void {
    fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }

  createJob(job: UserImportJob): UserImportJob {
    const state = this.read();
    state.jobs.push(job);
    this.write(state);
    return job;
  }

  updateJob(job: UserImportJob): UserImportJob {
    const state = this.read();
    state.jobs = state.jobs.map((existing) => (existing.id === job.id ? job : existing));
    this.write(state);
    return job;
  }

  updateJobStatus(jobId: string, status: ImportJobStatus, completedAt?: Date | null): UserImportJob {
    const job = this.getJob(jobId);
    if (!job) {
      throw new Error(`Import job ${jobId} not found`);
    }
    return this.updateJob({ ...job, status, completedAt: completedAt ?? job.completedAt });
  }

  getJob(jobId: string): UserImportJob | null {
    return this.read().jobs.find((job) => job.id === jobId) ?? null;
  }

  listJobs(tenantId?: string): UserImportJob[] {
    const jobs = this.read().jobs;
    return tenantId ? jobs.filter((job) => job.tenantId === tenantId) : jobs;
  }

  replaceRows(jobId: string, rows: UserImportRow[]): void {
    const state = this.read();
    state.rows = [...state.rows.filter((row) => row.importJobId !== jobId), ...rows];
    this.write(state);
  }

  updateRows(rows: UserImportRow[]): void {
    const state = this.read();
    const updates = new Map(rows.map((row) => [row.id, row]));
    state.rows = state.rows.map((row) => updates.get(row.id) ?? row);
    this.write(state);
  }

  listRows(jobId: string): UserImportRow[] {
    return this.read().rows.filter((row) => row.importJobId === jobId);
  }

  findUserByEmployeeCode(tenantId: string, employeeCode: string): ProvisionedUser | null {
    return (
      this.read().users.find(
        (user) => user.tenantId === tenantId && user.employeeCode.toLowerCase() === employeeCode.toLowerCase()
      ) ?? null
    );
  }

  findUserByEmail(tenantId: string, workEmail: string): ProvisionedUser | null {
    return (
      this.read().users.find(
        (user) => user.tenantId === tenantId && user.workEmail?.toLowerCase() === workEmail.toLowerCase()
      ) ?? null
    );
  }

  createUser(user: ProvisionedUser): ProvisionedUser {
    const state = this.read();
    state.users.push(user);
    this.write(state);
    return user;
  }

  updateUser(user: ProvisionedUser): ProvisionedUser {
    const state = this.read();
    state.users = state.users.map((existing) => (existing.id === user.id ? user : existing));
    this.write(state);
    return user;
  }

  listUsers(tenantId: string): ProvisionedUser[] {
    return this.read().users.filter((user) => user.tenantId === tenantId);
  }

  createActivationRecord(record: ActivationRecord): ActivationRecord {
    const state = this.read();
    state.activationRecords.push(record);
    this.write(state);
    return record;
  }

  updateActivationRecord(record: ActivationRecord): ActivationRecord {
    const state = this.read();
    state.activationRecords = state.activationRecords.map((existing) =>
      existing.id === record.id ? record : existing
    );
    this.write(state);
    return record;
  }

  findActivationRecordByTokenHash(tokenHash: string): ActivationRecord | null {
    return (
      this.read().activationRecords.find((record) => record.activationTokenHash === tokenHash) ?? null
    );
  }

  listActivationRecords(tenantId: string): ActivationRecord[] {
    return this.read().activationRecords.filter((record) => record.tenantId === tenantId);
  }

  recordAssignment(outcome: RoleAssignmentOutcome): void {
    const state = this.read();
    state.assignments.push(outcome);
    this.write(state);
  }

  upsertComplianceStatuses(statuses: ComplianceStatus[]): void {
    const state = this.read();
    for (const status of statuses) {
      const index = state.complianceStatuses.findIndex(
        (existing) =>
          existing.tenantId === status.tenantId &&
          existing.userId === status.userId &&
          existing.requirementId === status.requirementId
      );
      if (index >= 0) {
        state.complianceStatuses[index] = status;
      } else {
        state.complianceStatuses.push(status);
      }
    }
    this.write(state);
  }

  listComplianceStatuses(tenantId: string, userId?: string): ComplianceStatus[] {
    return this.read().complianceStatuses.filter(
      (status) => status.tenantId === tenantId && (!userId || status.userId === userId)
    );
  }

  appendAudit(event: HrImportState["auditEvents"][number]): void {
    const state = this.read();
    state.auditEvents.push(event);
    this.write(state);
  }

  listAuditEvents(tenantId: string): HrImportState["auditEvents"] {
    return this.read().auditEvents.filter((event) => event.tenantId === tenantId);
  }
}
