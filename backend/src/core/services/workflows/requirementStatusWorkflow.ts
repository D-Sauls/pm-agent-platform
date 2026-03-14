import { z } from "zod";
import type { RequirementStatusResult } from "../../models/complianceModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";
import { AcknowledgementService } from "../compliance/AcknowledgementService.js";
import { ComplianceConfigService } from "../compliance/ComplianceConfigService.js";
import { ComplianceRequirementService } from "../compliance/ComplianceRequirementService.js";
import { ComplianceTrackingService } from "../compliance/ComplianceTrackingService.js";

const metadataSchema = z.object({
  userId: z.string().min(1),
  role: z.string().default("Employee"),
  department: z.string().optional()
});

export class RequirementStatusWorkflow implements BaseWorkflow {
  id = "requirement_status" as const;
  name = "Requirement Status Workflow";
  description = "Returns compliance requirement status for a user.";
  supportedInputTypes = ["requirement_status", "compliance_status", "training_status"];

  constructor(
    private readonly requirementService: ComplianceRequirementService,
    private readonly acknowledgementService: AcknowledgementService,
    private readonly trackingService: ComplianceTrackingService,
    private readonly configService: ComplianceConfigService
  ) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const metadata = metadataSchema.parse(context.metadata ?? {});
    const tenantId = context.tenantContext.tenant.tenantId;
    const statuses = this.trackingService.calculateStatuses({
      tenantId,
      userId: metadata.userId,
      requirements: this.requirementService.resolveApplicableRequirements(
        tenantId,
        metadata.role,
        metadata.department
      ),
      acknowledgements: this.acknowledgementService.findHistory({ tenantId, userId: metadata.userId }),
      config: this.configService.getConfig(tenantId)
    });

    const result: RequirementStatusResult = {
      workflowId: this.id,
      resultType: "requirement_status",
      userId: metadata.userId,
      statuses,
      generatedAt: new Date(),
      warnings: []
    };

    return {
      workflowId: this.id,
      resultType: result.resultType,
      data: result,
      generatedAt: result.generatedAt,
      confidenceScore: 0.91,
      warnings: result.warnings
    };
  }
}
