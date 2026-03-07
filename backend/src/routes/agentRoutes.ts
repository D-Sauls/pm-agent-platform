import { Router } from "express";
import { handleAgentResponse } from "../controllers/agentController.js";

export const agentRoutes = Router();

agentRoutes.post("/respond", handleAgentResponse);
