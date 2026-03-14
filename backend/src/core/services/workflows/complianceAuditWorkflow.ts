import { z } from "zod";
import type { ComplianceAuditResult } from "../../models/complianceModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";
import { AcknowledgementService } from "../compliance/AcknowledgementService.js";
import { ComplianceReportService } from "../compliance/ComplianceReportService.js";
import { ComplianceTrackingService } from "../compliance/ComplianceTrackingService.js";
import { ComplianceRequirementService } from "../compliance/ComplianceRequirementService.js";
import { ComplianceConfigService } from "../compliance/ComplianceConfigService.js";

const metadataSchema = z.object({
  userId: z.string().optional(),
  role: z.string().default("Employee"),
  department: z.string().optional()
});

export class ComplianceAuditWorkflow implements BaseWorkflow {
  id = "compliance_audit" as const;
  name = "Compliance Audit Workflow";
  description = "Summarizes overdue and outstanding compliance gaps for a tenant or user.";
  supportedInputTypes = ["compliance_audit", "overdue_training", "acknowledgement_audit"];

  constructor(
    private readonly requirementService: ComplianceRequirementService,
    private readonly acknowledgementService: AcknowledgementService,
    private readonly trackingService: ComplianceTrackingService,
    private readonly reportService: ComplianceReportService,
    private readonly configService: ComplianceConfigService
  ) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const metadata = metadataSchema.parse(context.metadata ?? {});
    const tenantId = context.tenantContext.tenant.tenantId;
    const requirements = this.requirementService.resolveApplicableRequirements(
      tenantId,
      metadata.role,
      metadata.department
    );
    const acknowledgements = this.acknowledgementService.findHistory({
      tenantId,
      userId: metadata.userId
    });
    const statuses = this.trackingService.calculateStatuses({
      tenantId,
      userId: metadata.userId ?? "tenant-scope",
      requirements,
      acknowledgements,
      config: this.configService.getConfig(tenantId)
    });
    const overdueItems = statuses.filter((status) => status.status === "overdue");
    const outstanding = this.reportService.outstandingAcknowledgements(tenantId, acknowledgements);

    const result: ComplianceAuditResult = {
      workflowId: this.id,
      resultType: "compliance_audit",
      userId: metadata.userId,
      overallStatus:
        overdueItems.length > 0 ? "non_compliant" : outstanding.length > 0 ? "at_risk" : "compliant",
      overdueItems,
      outstandingAcknowledgements: outstanding,
      summary:
        overdueItems.length > 0
          ? `${overdueItems.length} overdue compliance item(s) require attention.`
          : outstanding.length > 0
            ? `${outstanding.length} acknowledgement item(s) are still outstanding.`
            : "No outstanding compliance gaps were detected for the selected scope.",
      generatedAt: new Date(),
      warnings: []
    };

    return {
      workflowId: this.id,
      resultType: result.resultType,
      data: result,
      generatedAt: result.generatedAt,
      confidenceScore: 0.9,
      warnings: result.warnings
    };
  }
}
