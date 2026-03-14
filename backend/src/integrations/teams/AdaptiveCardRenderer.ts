import type { AgentExecutionResponse } from "../../core/services/workflows/agentOrchestrator.js";
import type { AgenticExecutionResponse } from "../../core/models/agenticModels.js";

interface AdaptiveCard {
  type: "AdaptiveCard";
  version: "1.5";
  body: Array<Record<string, unknown>>;
}

export class AdaptiveCardRenderer {
  render(execution: AgentExecutionResponse | AgenticExecutionResponse): AdaptiveCard {
    const now = new Date().toISOString();
    const normalized = this.normalize(execution);
    const data = normalized.data as Record<string, any>;
    const recommendations =
      data.recommendations ??
      data.recommendedActions ??
      data.recommendedFocus ??
      data.decisionsRequired ??
      [];

    const metrics = this.extractMetrics(data);
    return {
      type: "AdaptiveCard",
      version: "1.5",
      body: [
        {
          type: "TextBlock",
          text: this.titleFor(normalized.workflowId),
          weight: "Bolder",
          size: "Medium"
        },
        {
          type: "FactSet",
          facts: [
            { title: "Workflow", value: normalized.workflowId },
            ...metrics,
            { title: "Generated", value: now }
          ]
        },
        {
          type: "TextBlock",
          text: "Recommended Actions",
          weight: "Bolder",
          wrap: true
        },
        {
          type: "TextBlock",
          text: (Array.isArray(recommendations) && recommendations.length > 0
            ? recommendations.slice(0, 5).join("\n- ")
            : "No recommendations returned."),
          wrap: true
        }
      ]
    };
  }

  private normalize(execution: AgentExecutionResponse | AgenticExecutionResponse): {
    workflowId: string;
    data: Record<string, unknown>;
  } {
    if ("result" in execution) {
      return {
        workflowId: execution.workflowId,
        data: execution.result.data as Record<string, unknown>
      };
    }
    return {
      workflowId: "agentic_goal",
      data: {
        synthesizedSummary: execution.response.synthesizedSummary,
        keyFindings: execution.response.keyFindings,
        recommendations: execution.response.recommendedActions,
        warnings: execution.response.warnings,
        workflowsExecuted: execution.response.workflowsExecuted
      }
    };
  }

  private titleFor(workflowId: string): string {
    const titles: Record<string, string> = {
      weekly_report: "Weekly Report",
      raid_extraction: "RAID Extraction",
      change_assessment: "Change Assessment",
      delivery_advisor: "Delivery Advisor",
      project_summary: "Project Summary",
      forecast: "Forecast",
      weekly_time_report: "Weekly Time Report",
      monthly_billing_summary: "Monthly Billing Summary"
      ,
      agentic_goal: "Agentic Goal Response"
    };
    return titles[workflowId] ?? "PM Agent Result";
  }

  private extractMetrics(data: Record<string, any>): Array<{ title: string; value: string }> {
    const facts: Array<{ title: string; value: string }> = [];
    const numericKeys = [
      "totalHours",
      "billableHours",
      "nonBillableHours",
      "billableRatio",
      "overallRagStatus",
      "deliveryHealth"
    ];
    for (const key of numericKeys) {
      if (data[key] !== undefined && data[key] !== null) {
        facts.push({ title: key, value: String(data[key]) });
      }
    }
    return facts.slice(0, 5);
  }
}
