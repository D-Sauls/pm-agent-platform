import { AgentService } from "../../../services/AgentService.js";
import { NormalizationService } from "../../../services/NormalizationService.js";
import { ReportingEngine } from "../../../services/ReportingEngine.js";
import { ProjectContextService } from "../../../services/projectContextService.js";
import { ReportingEngineMvp } from "../../../services/reportingEngine.js";
import { PromptEngine } from "../prompt/PromptEngine.js";
import type { PromptTemplateKey } from "../prompt/PromptEngine.js";
import type { AgentOperation, OrchestrationInput, OrchestrationOutput } from "./types.js";

interface ResolvedOperation {
  operation: AgentOperation;
  template: PromptTemplateKey;
}

// Operation-aware orchestrator for PM assistant workflows.
export class AgentOrchestrationService {
  private normalizationService = new NormalizationService();
  private reportingEngine = new ReportingEngine();
  private reportingEngineMvp = new ReportingEngineMvp();
  private projectContextService = new ProjectContextService();
  private agentService = new AgentService();
  private promptEngine = new PromptEngine();

  async run(input: OrchestrationInput): Promise<OrchestrationOutput> {
    const resolved = this.resolveOperation(input.userInput, input.requestType);
    if (resolved.operation === "weekly_highlight_report") {
      return this.runWeeklyReportFlow(input, resolved);
    }

    const normalizedProject = await this.normalizationService.collectAndNormalizeProject(input.projectId);

    const weeklyReport = undefined;

    const raidLog =
      resolved.operation === "raid_extraction"
        ? this.reportingEngine.buildRaidLog(normalizedProject, input.deliveryMode)
        : undefined;

    const changeAssessment =
      resolved.operation === "change_request_assessment"
        ? this.reportingEngine.buildChangeAssessment(
            normalizedProject,
            input.deliveryMode,
            this.extractChangeRequestTitle(input.userInput)
          )
        : undefined;

    const context = this.buildOperationContext(input, resolved.operation, {
      normalizedProject,
      weeklyReport,
      raidLog,
      changeAssessment
    });

    const modelPrompt = this.promptEngine.buildPrompt(resolved.template, input.deliveryMode, context);
    const rawNarrative = await this.promptEngine.generate(modelPrompt);
    const narrativeResponse = this.agentService.postProcessNarrative(rawNarrative);
    const timestamp = new Date().toISOString();

    this.logRequest({
      projectId: input.projectId,
      requestType: resolved.operation,
      timestamp,
      connectorUsed: normalizedProject.sourceSystem
    });

    return {
      operation: resolved.operation,
      promptTemplate: resolved.template,
      narrativeResponse,
      generatedAt: timestamp,
      connectorUsed: normalizedProject.sourceSystem,
      weeklyReport,
      raidLog,
      changeAssessment,
      recommendedActions:
        resolved.operation === "next_pm_actions"
          ? this.extractRecommendedActions(narrativeResponse)
          : undefined
    };
  }

  private async runWeeklyReportFlow(
    input: OrchestrationInput,
    resolved: ResolvedOperation
  ): Promise<OrchestrationOutput> {
    const projectContext = await this.projectContextService.collectProjectContext(input.projectId);
    const promptContext = JSON.stringify(
      {
        requestType: resolved.operation,
        userInput: input.userInput,
        project: projectContext.snapshot.project,
        tasks: projectContext.snapshot.tasks,
        milestones: projectContext.snapshot.milestones,
        risks: projectContext.snapshot.risks,
        issues: projectContext.snapshot.issues,
        dependencies: projectContext.snapshot.dependencies
      },
      null,
      2
    );

    const modelPrompt = this.promptEngine.buildPrompt("weekly_report", input.deliveryMode, promptContext);
    const rawNarrative = await this.promptEngine.generate(modelPrompt);
    const weeklyReport = this.reportingEngineMvp.generateWeeklyHighlightReport({
      snapshot: projectContext.snapshot,
      llmWeeklyDraft: rawNarrative,
      connectorUsed: projectContext.connectorUsed
    });

    const timestamp = new Date().toISOString();
    this.logRequest({
      projectId: input.projectId,
      requestType: resolved.operation,
      timestamp,
      connectorUsed: projectContext.connectorUsed
    });

    return {
      operation: resolved.operation,
      promptTemplate: resolved.template,
      narrativeResponse: rawNarrative,
      generatedAt: timestamp,
      connectorUsed: projectContext.connectorUsed,
      weeklyReport
    };
  }

  private resolveOperation(userInput: string, explicit?: AgentOperation): ResolvedOperation {
    if (explicit) {
      return { operation: explicit, template: this.templateForOperation(explicit) };
    }

    const normalized = userInput.toLowerCase();
    if (this.hasAny(normalized, ["weekly", "highlight", "status report", "weekly report"])) {
      return {
        operation: "weekly_highlight_report",
        template: this.templateForOperation("weekly_highlight_report")
      };
    }

    if (this.hasAny(normalized, ["raid", "risk", "issue", "assumption", "dependency", "extract"])) {
      return { operation: "raid_extraction", template: this.templateForOperation("raid_extraction") };
    }

    if (this.hasAny(normalized, ["change request", "impact assessment", "cr", "scope change"])) {
      return {
        operation: "change_request_assessment",
        template: this.templateForOperation("change_request_assessment")
      };
    }

    return { operation: "next_pm_actions", template: this.templateForOperation("next_pm_actions") };
  }

  private templateForOperation(operation: AgentOperation): PromptTemplateKey {
    switch (operation) {
      case "weekly_highlight_report":
        return "weekly_report";
      case "raid_extraction":
        return "raid_extraction";
      case "change_request_assessment":
        return "change_assessment";
      case "next_pm_actions":
      default:
        return "planning_assistant";
    }
  }

  private buildOperationContext(
    input: OrchestrationInput,
    operation: AgentOperation,
    artifacts: {
      normalizedProject: Awaited<ReturnType<NormalizationService["collectAndNormalizeProject"]>>;
      weeklyReport?: Awaited<ReturnType<ReportingEngine["buildWeeklyHighlightReport"]>>;
      raidLog?: Awaited<ReturnType<ReportingEngine["buildRaidLog"]>>;
      changeAssessment?: Awaited<ReturnType<ReportingEngine["buildChangeAssessment"]>>;
    }
  ): string {
    return JSON.stringify(
      {
        operation,
        userInput: input.userInput,
        deliveryMode: input.deliveryMode,
        projectSnapshot: artifacts.normalizedProject,
        artifacts: {
          weeklyReport: artifacts.weeklyReport,
          raidLog: artifacts.raidLog,
          changeAssessment: artifacts.changeAssessment
        }
      },
      null,
      2
    );
  }

  private extractChangeRequestTitle(userInput: string): string {
    const trimmed = userInput.trim();
    return trimmed.length > 100 ? `${trimmed.slice(0, 97)}...` : trimmed;
  }

  private extractRecommendedActions(text: string): string[] {
    const actions = text
      .split("\n")
      .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
      .filter((line) => line.length > 0)
      .slice(0, 5);

    return actions.length > 0 ? actions : ["Stub: prioritize top risk mitigation and milestone review"];
  }

  private hasAny(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => text.includes(pattern));
  }

  private logRequest(entry: {
    projectId: string;
    requestType: AgentOperation;
    timestamp: string;
    connectorUsed: string;
  }): void {
    console.info("[AgentRequest]", JSON.stringify(entry));
  }
}
