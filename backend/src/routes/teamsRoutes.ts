import { Router } from "express";
import {
  agenticOrchestratorServiceV2,
  usageLogServiceV2
} from "../core/container.js";
import { AdaptiveCardRenderer } from "../integrations/teams/AdaptiveCardRenderer.js";
import { TeamsAuthService } from "../integrations/teams/TeamsAuthService.js";
import { TeamsBotController } from "../integrations/teams/TeamsBotController.js";
import { TeamsMessageRouter } from "../integrations/teams/TeamsMessageRouter.js";

const controller = new TeamsBotController(
  new TeamsAuthService(),
  new TeamsMessageRouter(),
  {
    goalExecute: (input) =>
      agenticOrchestratorServiceV2.executeGoal({
        tenantId: input.tenantId,
        message: input.message,
        metadata: input.metadata
      })
  },
  new AdaptiveCardRenderer(),
  usageLogServiceV2
);

export const teamsRoutes = Router();
teamsRoutes.post("/messages", controller.handleMessage);
