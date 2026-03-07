import { z } from "zod";

export const deliveryModeSchema = z.enum(["Waterfall", "AgileLean", "HybridPrince2Agile"]);

export const agentOperationSchema = z.enum([
  "weekly_highlight_report",
  "raid_extraction",
  "change_request_assessment",
  "next_pm_actions"
]);

const weeklyHighlightReportSchema = z.object({
  projectSummary: z.string(),
  achievementsThisPeriod: z.array(z.string()),
  upcomingWork: z.array(z.string()),
  risksIssues: z.array(z.string()),
  dependencies: z.array(z.string()),
  decisionsRequired: z.array(z.string()),
  overallRagStatus: z.enum(["Red", "Amber", "Green"])
});

export const agentRequestSchema = z.object({
  projectId: z.string().min(1),
  userInput: z.string().min(1),
  deliveryMode: deliveryModeSchema,
  requestType: agentOperationSchema.optional()
});

export const agentResponseSchema = z.object({
  operation: agentOperationSchema,
  promptTemplate: z.enum([
    "weekly_report",
    "raid_extraction",
    "change_assessment",
    "planning_assistant"
  ]),
  narrativeResponse: z.string(),
  generatedAt: z.string(),
  connectorUsed: z.string().optional(),
  weeklyReport: weeklyHighlightReportSchema.optional(),
  raidLog: z
    .object({
      risks: z.array(z.any()),
      issues: z.array(z.any()),
      assumptions: z.array(z.string()),
      dependencies: z.array(z.any())
    })
    .optional(),
  changeAssessment: z
    .object({
      id: z.string(),
      projectId: z.string(),
      title: z.string(),
      impactSummary: z.string(),
      recommendation: z.string()
    })
    .optional(),
  recommendedActions: z.array(z.string()).optional()
});

export type AgentRequestDto = z.infer<typeof agentRequestSchema>;
