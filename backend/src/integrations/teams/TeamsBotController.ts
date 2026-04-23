import type { Request, Response } from "express";
import type { UsageLogService } from "../../core/services/UsageLogService.js";
import type { AgentExecutor, TeamsActivity } from "./types.js";
import { AdaptiveCardRenderer } from "./AdaptiveCardRenderer.js";
import { TeamsAuthService } from "./TeamsAuthService.js";
import { TeamsMessageRouter } from "./TeamsMessageRouter.js";

export class TeamsBotController {
  constructor(
    private readonly authService: TeamsAuthService,
    private readonly messageRouter: TeamsMessageRouter,
    private readonly agentExecutor: AgentExecutor,
    private readonly cardRenderer: AdaptiveCardRenderer,
    private readonly usageLogService: UsageLogService
  ) {}

  handleMessage = async (req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    const activity = req.body as TeamsActivity;
    if (!activity || activity.type !== "message") {
      res.status(200).json({ type: "message", text: "Event ignored" });
      return;
    }

    const user = this.authService.resolve(activity, typeof req.query?.tenantId === "string" ? req.query.tenantId : undefined);

    try {
      const route = await this.messageRouter.route(user.platformTenantId, activity);
      const metadata = {
        ...(route.metadata ?? {}),
        teamsTenantId: user.teamsTenantId,
        teamsUserId: user.teamsUserId
      };
      const execution = await this.agentExecutor.goalExecute({
        tenantId: route.tenantId,
        message: route.message,
        metadata
      });
      const card = this.cardRenderer.render(execution);
      const workflowId = this.resolveWorkflowId(execution);
      const connectorUsed = this.resolveConnectorUsed(execution);

      await this.usageLogService.recordWorkflowRequest({
        tenantId: route.tenantId,
        userId: user.teamsUserId,
        requestType: "teams_message",
        workflowType: "teams_bot",
        workflowId,
        connectorUsed,
        responseTimeMs: Date.now() - start,
        success: true
      });

      res.status(200).json({
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: card
          }
        ]
      });
    } catch (error) {
      await this.usageLogService.recordWorkflowRequest({
        tenantId: user.platformTenantId,
        userId: user.teamsUserId,
        requestType: "teams_message",
        workflowType: "teams_bot",
        workflowId: "teams_error",
        responseTimeMs: Date.now() - start,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Teams processing failed"
      });

      const message = error instanceof Error ? error.message : "Teams bot failed";
      res.status(400).json({ error: message });
    }
  };

  private resolveWorkflowId(_execution: Awaited<ReturnType<AgentExecutor["goalExecute"]>>): string {
    return "agentic_goal";
  }

  private resolveConnectorUsed(
    execution: Awaited<ReturnType<AgentExecutor["goalExecute"]>>
  ): string {
    return execution.response.workflowsExecuted.join(",");
  }
}
