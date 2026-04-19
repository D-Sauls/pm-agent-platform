import type { Request } from "express";
import { Router } from "express";
import { z } from "zod";
import { userImportServiceV2, userProvisioningServiceV2 } from "../../core/container.js";
import { defaultProvisioningConfig, type HrImportFileType } from "../../core/models/hrImportModels.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";
import { adminAuditService } from "../../context/platformContext.js";

const bodySchema = z.object({
  tenantId: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.enum(["csv", "xlsx"]).optional(),
  fileContentBase64: z.string().min(1),
  columnMapping: z.record(z.string()).optional(),
  config: z.record(z.unknown()).optional()
});
const maxImportBytes = 5 * 1024 * 1024;

function inferFileType(fileName: string, explicit?: string): HrImportFileType {
  const type = explicit ?? fileName.split(".").pop()?.toLowerCase();
  if (type === "csv" || type === "xlsx") return type;
  throw new Error("Only csv and xlsx files are supported.");
}

async function readMultipart(req: Request): Promise<Record<string, { value?: string; fileName?: string; data?: Buffer }>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);
  const contentType = req.header("content-type") ?? "";
  const boundary = contentType.match(/boundary=([^;]+)/)?.[1];
  if (!boundary) throw new Error("Missing multipart boundary.");
  const raw = body.toString("binary");
  const parts = raw.split(`--${boundary}`).filter((part) => part.includes("Content-Disposition"));
  const fields: Record<string, { value?: string; fileName?: string; data?: Buffer }> = {};
  for (const part of parts) {
    const [rawHeaders, rawContent = ""] = part.split("\r\n\r\n");
    const name = rawHeaders.match(/name="([^"]+)"/)?.[1];
    if (!name) continue;
    const fileName = rawHeaders.match(/filename="([^"]*)"/)?.[1];
    const content = rawContent.replace(/\r\n--$/, "").replace(/\r\n$/, "");
    fields[name] = fileName
      ? { fileName, data: Buffer.from(content, "binary") }
      : { value: content.trim() };
  }
  return fields;
}

async function parseJobRequest(req: Request) {
  if (req.is("multipart/form-data")) {
    const fields = await readMultipart(req);
    const file = fields.file;
    if (!file?.data || !file.fileName) throw new Error("file is required.");
    if (file.data.byteLength > maxImportBytes) throw new Error("HR import file exceeds 5MB limit.");
    return {
      tenantId: fields.tenantId?.value ?? "",
      fileName: fields.fileName?.value ?? file.fileName,
      fileType: inferFileType(fields.fileName?.value ?? file.fileName, fields.fileType?.value),
      fileContent: file.data,
      columnMapping: fields.columnMapping?.value ? JSON.parse(fields.columnMapping.value) : undefined,
      config: fields.config?.value ? JSON.parse(fields.config.value) : undefined
    };
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new Error("Invalid HR import payload.");
  }
  return {
    tenantId: parsed.data.tenantId,
    fileName: parsed.data.fileName,
    fileType: inferFileType(parsed.data.fileName, parsed.data.fileType),
    fileContent: (() => {
      const content = Buffer.from(parsed.data.fileContentBase64, "base64");
      if (content.byteLength > maxImportBytes) throw new Error("HR import file exceeds 5MB limit.");
      return content;
    })(),
    columnMapping: parsed.data.columnMapping,
    config: parsed.data.config
  };
}

export const adminHrImportRoutes = Router();

adminHrImportRoutes.post(
  "/jobs",
  requireAdminRole(["superadmin", "supportadmin"]),
  async (req, res, next) => {
    try {
      const input = await parseJobRequest(req);
      const result = await userImportServiceV2.createJob({
        ...input,
        uploadedBy: req.adminUser?.email ?? "unknown-admin"
      });
      adminAuditService.record(req.adminUser!, "hr_import.job.create", input.tenantId, {
        jobId: result.job.id,
        fileName: result.job.fileName
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

adminHrImportRoutes.get(
  "/jobs",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const tenantId = String(req.query.tenantId ?? "");
    res.json({ jobs: userImportServiceV2.listJobs(tenantId) });
  }
);

adminHrImportRoutes.get(
  "/jobs/:jobId",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const tenantId = String(req.query.tenantId ?? "");
    const job = userImportServiceV2.getJob(tenantId, req.params.jobId);
    if (!job) return res.status(404).json({ code: "NOT_FOUND", message: "Import job not found" });
    return res.json(job);
  }
);

adminHrImportRoutes.get(
  "/jobs/:jobId/rows",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const tenantId = String(req.query.tenantId ?? "");
    res.json({ rows: userImportServiceV2.listRows(tenantId, req.params.jobId) });
  }
);

adminHrImportRoutes.post(
  "/jobs/:jobId/preview",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const tenantId = String(req.body?.tenantId ?? req.query.tenantId ?? "");
    const preview = userImportServiceV2.preview(tenantId, req.params.jobId);
    if (!preview) return res.status(404).json({ code: "NOT_FOUND", message: "Import job not found" });
    return res.json(preview);
  }
);

adminHrImportRoutes.post(
  "/jobs/:jobId/process",
  requireAdminRole(["superadmin", "supportadmin"]),
  async (req, res, next) => {
    try {
      const tenantId = String(req.body?.tenantId ?? "");
      const summary = await userImportServiceV2.process(tenantId, req.params.jobId, req.body?.config);
      if (!summary) return res.status(404).json({ code: "NOT_FOUND", message: "Import job not found" });
      adminAuditService.record(req.adminUser!, "hr_import.job.process", tenantId, {
        jobId: req.params.jobId,
        successfulRows: summary.job.successfulRows,
        failedRows: summary.job.failedRows
      });
      return res.json(summary);
    } catch (error) {
      return next(error);
    }
  }
);

adminHrImportRoutes.post(
  "/users/:userId/send-activation",
  requireAdminRole(["superadmin", "supportadmin"]),
  (req, res, next) => {
    try {
      const tenantId = String(req.body?.tenantId ?? "");
      const record = userProvisioningServiceV2.resendActivation(
        tenantId,
        req.params.userId,
        { ...defaultProvisioningConfig, ...req.body?.config }
      );
      adminAuditService.record(req.adminUser!, "hr_import.activation.resent", tenantId, {
        userId: req.params.userId
      });
      res.json({ activationRecord: record });
    } catch (error) {
      next(error);
    }
  }
);
