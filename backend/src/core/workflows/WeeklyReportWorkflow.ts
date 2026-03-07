import { z } from "zod";
import type { WeeklyReportOutput } from "../models/projectModels.js";
import type { TenantContext } from "../models/tenantModels.js";
import { ProjectContextService } from "../services/ProjectContextService.js";
import { ReportingEngine } from "../services/ReportingEngine.js";
import { TenantContextService } from "../services/TenantContextService.js";

const weeklyReportInputSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().min(1),
  userPrompt: z.string().optional()
});

export type WeeklyReportWorkflowInput = z.infer<typeof weeklyReportInputSchema>;

export interface WeeklyReportWorkflowResponse {
  tenantContext: Pick<TenantContext, "tenant" | "license">;
  report: WeeklyReportOutput;
}

export class WeeklyReportWorkflow {
  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly projectContextService: ProjectContextService,
    private readonly reportingEngine: ReportingEngine
  ) {}

  async execute(input: WeeklyReportWorkflowInput): Promise<WeeklyReportWorkflowResponse> {
    const validated = weeklyReportInputSchema.parse(input);
    const tenantContext = await this.tenantContextService.resolve(validated.tenantId);
    const projectContext = await this.projectContextService.getProjectContext(
      tenantContext,
      validated.projectId
    );
    const report = await this.reportingEngine.generateWeeklyReport({
      tenantContext,
      projectContext,
      userPrompt: validated.userPrompt
    });

    return {
      tenantContext: {
        tenant: tenantContext.tenant,
        license: tenantContext.license
      },
      report
    };
  }
}
