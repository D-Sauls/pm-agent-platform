import type { AgenticResponse } from "../../models/agenticModels.js";
import type { WorkflowResult } from "../workflows/baseWorkflow.js";

export class ResultSynthesisService {
  synthesize(
    goalMessage: string,
    workflowResults: WorkflowResult[],
    planWarnings: string[]
  ): AgenticResponse {
    const findings: string[] = [];
    const actions: string[] = [];
    const assumptions: string[] = [];
    const warnings = [...planWarnings];

    for (const result of workflowResults) {
      const data = result.data as Record<string, unknown>;
      findings.push(...this.pickStrings(data, ["projectOverview", "progressSummary", "statusSummary"]));
      findings.push(...this.pickArray(data, ["risksIssues", "risks", "blockers", "dependencies"]));
      actions.push(
        ...this.pickArray(data, [
          "recommendedActions",
          "recommendedFocus",
          "decisionsRequired",
          "recommendations"
        ])
      );
      assumptions.push(...this.pickArray(data, ["assumptionsMade", "assumptions"]));
      warnings.push(...this.pickArray(data, ["warnings"]));
    }

    const dedupedFindings = this.unique(findings).slice(0, 10);
    const dedupedActions = this.unique(actions).slice(0, 10);
    const dedupedAssumptions = this.unique(assumptions).slice(0, 10);
    const dedupedWarnings = this.unique(warnings).slice(0, 10);
    const workflowsExecuted = workflowResults.map((result) => result.workflowId);

    const summaryParts = [
      `Goal interpreted as: ${goalMessage}`,
      workflowsExecuted.length > 0
        ? `Executed workflows: ${workflowsExecuted.join(", ")}.`
        : "No workflows executed.",
      dedupedFindings.length > 0
        ? `Key signals: ${dedupedFindings.slice(0, 3).join(" | ")}.`
        : "No key signals were produced."
    ];

    return {
      goalSummary: goalMessage,
      workflowsExecuted,
      synthesizedSummary: summaryParts.join(" "),
      keyFindings: dedupedFindings,
      recommendedActions: dedupedActions,
      assumptionsMade: dedupedAssumptions,
      warnings: dedupedWarnings,
      generatedAt: new Date()
    };
  }

  private pickStrings(data: Record<string, unknown>, keys: string[]): string[] {
    const values: string[] = [];
    for (const key of keys) {
      const value = data[key];
      if (typeof value === "string" && value.trim().length > 0) {
        values.push(value.trim());
      }
    }
    return values;
  }

  private pickArray(data: Record<string, unknown>, keys: string[]): string[] {
    const values: string[] = [];
    for (const key of keys) {
      const value = data[key];
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (typeof entry === "string" && entry.trim().length > 0) {
            values.push(entry.trim());
          }
        }
      }
    }
    return values;
  }

  private unique(values: string[]): string[] {
    return Array.from(new Set(values));
  }
}
