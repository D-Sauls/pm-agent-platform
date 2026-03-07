import type { NormalizedProjectSnapshot, WeeklyHighlightReport } from "../models/entities.js";

interface WeeklyReportInput {
  snapshot: NormalizedProjectSnapshot;
  llmWeeklyDraft: string;
  connectorUsed: string;
}

// Generates structured weekly highlight reports for Teams rendering.
export class ReportingEngineMvp {
  generateWeeklyHighlightReport(input: WeeklyReportInput): WeeklyHighlightReport {
    const completedTasks = input.snapshot.tasks.filter((task) =>
      ["done", "complete", "completed"].includes(task.status.toLowerCase())
    );
    const upcomingTasks = input.snapshot.tasks.filter(
      (task) => !["done", "complete", "completed"].includes(task.status.toLowerCase())
    );

    const decisionsRequired = this.inferDecisions(input.snapshot);
    const overallRagStatus = this.calculateRagStatus(input.snapshot);

    return {
      projectSummary: `${input.snapshot.project.name} (${input.snapshot.project.id}) sourced from ${input.connectorUsed}. LLM draft: ${input.llmWeeklyDraft}`,
      achievementsThisPeriod:
        completedTasks.map((task) => `${task.title} (${task.assignee ?? "Unassigned"})`) || [],
      upcomingWork:
        upcomingTasks.map((task) => `${task.title} - ${task.status} (${task.dueDate ?? "No due date"})`) ||
        [],
      risksIssues: [
        ...input.snapshot.risks.map((risk) => `Risk: ${risk.summary} [${risk.probability}/${risk.impact}]`),
        ...input.snapshot.issues.map((issue) => `Issue: ${issue.summary} [${issue.severity}]`)
      ],
      dependencies: input.snapshot.dependencies.map((dep) => dep.summary),
      decisionsRequired,
      overallRagStatus
    };
  }

  private inferDecisions(snapshot: NormalizedProjectSnapshot): string[] {
    const atRiskMilestones = snapshot.milestones.filter((m) =>
      ["at risk", "risk", "delayed"].includes(m.status.toLowerCase())
    );
    if (atRiskMilestones.length > 0) {
      return atRiskMilestones.map((m) => `Approve mitigation plan for milestone: ${m.name}`);
    }

    return ["Confirm next milestone ownership and escalation path."];
  }

  private calculateRagStatus(snapshot: NormalizedProjectSnapshot): "Red" | "Amber" | "Green" {
    const highRiskCount = snapshot.risks.filter(
      (r) => r.impact === "High" || r.probability === "High"
    ).length;
    const highIssueCount = snapshot.issues.filter((i) => i.severity === "High").length;

    if (highRiskCount > 0 || highIssueCount > 0) {
      return "Red";
    }

    if (snapshot.dependencies.length > 0) {
      return "Amber";
    }

    return "Green";
  }
}
