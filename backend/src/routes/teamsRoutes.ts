import { Router } from "express";
import { agentOrchestratorV2, repositories, usageLogServiceV2 } from "../core/container.js";
import { AdaptiveCardRenderer } from "../integrations/teams/AdaptiveCardRenderer.js";
import { TeamsAuthService } from "../integrations/teams/TeamsAuthService.js";
import { TeamsBotController } from "../integrations/teams/TeamsBotController.js";
import { TeamsMessageRouter } from "../integrations/teams/TeamsMessageRouter.js";

const controller = new TeamsBotController(
  new TeamsAuthService(),
  new TeamsMessageRouter(repositories.projectRepository),
  agentOrchestratorV2,
  new AdaptiveCardRenderer(),
  usageLogServiceV2
);

export const teamsRoutes = Router();
teamsRoutes.post("/messages", controller.handleMessage);
