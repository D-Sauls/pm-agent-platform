import cors from "cors";
import express from "express";
import { authenticateUser } from "./middleware/AuthMiddleware.js";
import { tenantMiddleware } from "./middleware/TenantMiddleware.js";
import { agentRoutes } from "./routes/agentRoutes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use("/api/agent", authenticateUser, tenantMiddleware, agentRoutes);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
