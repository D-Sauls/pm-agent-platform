import { randomUUID } from "node:crypto";
import type {
  ColumnMapping,
  HrImportFileType,
  ImportProcessingSummary,
  ProvisioningConfig,
  UserImportJob,
  UserImportRow
} from "../../models/hrImportModels.js";
import { defaultProvisioningConfig } from "../../models/hrImportModels.js";
import type { FileHrImportRepository } from "./FileHrImportRepository.js";
import type { ImportAuditService } from "./ImportAuditService.js";
import type { ImportMappingService } from "./ImportMappingService.js";
import type { ImportValidationService } from "./ImportValidationService.js";
import type { RoleAssignmentService } from "./RoleAssignmentService.js";
import type { SpreadsheetParserService } from "./SpreadsheetParserService.js";
import type { UserProvisioningService } from "./UserProvisioningService.js";

export interface CreateImportJobInput {
  tenantId: string;
  uploadedBy: string;
  fileName: string;
  fileType: HrImportFileType;
  fileContent: Buffer;
  columnMapping?: ColumnMapping;
  config?: Partial<ProvisioningConfig>;
}

export class UserImportService {
  constructor(
    private readonly repository: FileHrImportRepository,
    private readonly parser: SpreadsheetParserService,
    private readonly mappingService: ImportMappingService,
    private readonly validationService: ImportValidationService,
    private readonly provisioningService: UserProvisioningService,
    private readonly roleAssignmentService: RoleAssignmentService,
    private readonly auditService: ImportAuditService
  ) {}

  async createJob(input: CreateImportJobInput): Promise<{ job: UserImportJob; rows: UserImportRow[]; mapping: ColumnMapping }> {
    const startedAt = new Date();
    const job: UserImportJob = {
      id: randomUUID(),
      tenantId: input.tenantId,
      fileName: input.fileName,
      fileType: input.fileType,
      uploadedBy: input.uploadedBy,
      startedAt,
      completedAt: null,
      status: "uploaded",
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0
    };
    this.repository.createJob(job);
    this.auditService.record(input.tenantId, "hr_import.job.created", job.id, {
      fileName: input.fileName,
      fileType: input.fileType
    });

    try {
      this.repository.updateJobStatus(job.id, "validating");
      const parsed = this.parser.parse(input.fileType, input.fileContent);
      const mapping = this.mappingService.inferMapping(parsed.headers, input.columnMapping);
      const config = { ...defaultProvisioningConfig, ...input.config };
      const rows = parsed.rows.map<UserImportRow>((rawData, index) => ({
        id: randomUUID(),
        importJobId: job.id,
        rowNumber: index + 2,
        rawData,
        mappedData: this.mappingService.mapRow(rawData, mapping),
        validationStatus: "invalid",
        errorMessages: [],
        warningMessages: [],
        provisioningStatus: "pending",
        createdUserId: null
      }));
      const validatedRows = await this.validationService.validateRows(input.tenantId, rows, config);
      this.repository.replaceRows(job.id, validatedRows);
      const failedRows = validatedRows.filter((row) => row.validationStatus === "invalid").length;
      const updatedJob = this.repository.updateJob({
        ...job,
        status: "preview_ready",
        totalRows: validatedRows.length,
        successfulRows: 0,
        failedRows
      });
      this.auditService.record(input.tenantId, "hr_import.validation.completed", job.id, {
        totalRows: validatedRows.length,
        failedRows
      });
      return { job: updatedJob, rows: validatedRows, mapping };
    } catch (error) {
      const failedJob = this.repository.updateJob({
        ...job,
        status: "failed",
        completedAt: new Date(),
        failedRows: job.totalRows
      });
      this.auditService.record(input.tenantId, "hr_import.job.failed", job.id, {
        message: error instanceof Error ? error.message : "Unknown import failure"
      });
      return { job: failedJob, rows: [], mapping: {} };
    }
  }

  getJob(tenantId: string, jobId: string): UserImportJob | null {
    const job = this.repository.getJob(jobId);
    return job?.tenantId === tenantId ? job : null;
  }

  listJobs(tenantId: string): UserImportJob[] {
    return this.repository.listJobs(tenantId);
  }

  listRows(tenantId: string, jobId: string): UserImportRow[] {
    const job = this.getJob(tenantId, jobId);
    return job ? this.repository.listRows(jobId) : [];
  }

  preview(tenantId: string, jobId: string): { job: UserImportJob; rows: UserImportRow[] } | null {
    const job = this.getJob(tenantId, jobId);
    if (!job) return null;
    return { job, rows: this.repository.listRows(jobId) };
  }

  async process(
    tenantId: string,
    jobId: string,
    configOverrides?: Partial<ProvisioningConfig>
  ): Promise<ImportProcessingSummary | null> {
    const job = this.getJob(tenantId, jobId);
    if (!job) return null;
    const config = { ...defaultProvisioningConfig, ...configOverrides };
    this.repository.updateJobStatus(jobId, "processing");
    this.auditService.record(tenantId, "hr_import.processing.started", jobId);

    const rows = this.repository.listRows(jobId);
    const provisionedUsers = [];
    const failedRows: UserImportRow[] = [];
    const assignmentOutcomes = [];
    const updatedRows: UserImportRow[] = [];

    for (const row of rows) {
      if (row.validationStatus === "invalid") {
        const skipped = { ...row, provisioningStatus: "skipped" as const };
        failedRows.push(skipped);
        updatedRows.push(skipped);
        continue;
      }
      try {
        const { user } = this.provisioningService.provision(tenantId, row, config);
        const outcome = await this.roleAssignmentService.assign(user);
        provisionedUsers.push(user);
        assignmentOutcomes.push(outcome);
        updatedRows.push({ ...row, provisioningStatus: "provisioned", createdUserId: user.id });
        this.auditService.record(tenantId, "hr_import.row.provisioned", jobId, {
          rowNumber: row.rowNumber,
          userId: user.id
        });
      } catch (error) {
        const failed = {
          ...row,
          provisioningStatus: "failed" as const,
          errorMessages: [
            ...row.errorMessages,
            error instanceof Error ? error.message : "Provisioning failed."
          ]
        };
        failedRows.push(failed);
        updatedRows.push(failed);
        this.auditService.record(tenantId, "hr_import.row.failed", jobId, {
          rowNumber: row.rowNumber
        });
      }
    }

    this.repository.updateRows(updatedRows);
    const completedJob = this.repository.updateJob({
      ...job,
      status: "completed",
      completedAt: new Date(),
      successfulRows: provisionedUsers.length,
      failedRows: failedRows.length,
      totalRows: rows.length
    });
    this.auditService.record(tenantId, "hr_import.processing.completed", jobId, {
      successfulRows: completedJob.successfulRows,
      failedRows: completedJob.failedRows
    });
    return { job: completedJob, provisionedUsers, failedRows, assignmentOutcomes };
  }
}
