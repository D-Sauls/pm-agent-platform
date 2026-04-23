import type { AgenticExecutionResponse } from "../../core/models/agenticModels.js";

interface AdaptiveCard {
  type: "AdaptiveCard";
  version: "1.5";
  body: Array<Record<string, unknown>>;
}

export class AdaptiveCardRenderer {
  render(execution: AgenticExecutionResponse): AdaptiveCard {
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
            ? `- ${recommendations.slice(0, 5).join("\n- ")}`
            : "No recommendations returned."),
          wrap: true
        }
      ]
    };
  }

  private normalize(execution: AgenticExecutionResponse): {
    workflowId: string;
    data: Record<string, unknown>;
  } {
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
      course_recommendation: "Course Recommendation",
      onboarding_recommendation: "Onboarding Recommendation",
      next_training_step: "Next Training Step",
      role_knowledge_lookup: "Role Knowledge",
      policy_lookup: "Policy Lookup",
      learning_progress: "Learning Progress",
      knowledge_explain: "Knowledge Explanation",
      sharepoint_document_lookup: "SharePoint Knowledge Lookup",
      knowledge_document_summary: "Knowledge Summary",
      compliance_audit: "Compliance Audit",
      requirement_status: "Requirement Status",
      agentic_goal: "Learning Assistant Response"
    };
    return titles[workflowId] ?? "Learning Assistant Result";
  }

  private extractMetrics(data: Record<string, any>): Array<{ title: string; value: string }> {
    const facts: Array<{ title: string; value: string }> = [];
    const numericKeys = [
      "overallStatus",
      "progressPercent",
      "completedLessons",
      "totalLessons",
      "completionPercentage"
    ];
    for (const key of numericKeys) {
      if (data[key] !== undefined && data[key] !== null) {
        facts.push({ title: key, value: String(data[key]) });
      }
    }
    return facts.slice(0, 5);
  }
}
