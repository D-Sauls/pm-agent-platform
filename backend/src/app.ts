import cors from "cors";
import express from "express";
import { errorHandlerMiddleware } from "./core/middleware/ErrorHandlerMiddleware.js";
import { authenticateUser } from "./middleware/AuthMiddleware.js";
import { tenantMiddleware } from "./middleware/TenantMiddleware.js";
import { adminRoutes } from "./routes/admin/index.js";
import { agentRoutes } from "./routes/agentRoutes.js";
import { productRoutes } from "./routes/productRoutes.js";
import { teamsRoutes } from "./routes/teamsRoutes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use("/api/agent", authenticateUser, tenantMiddleware, agentRoutes);
  app.use("/api", productRoutes);
  app.use("/api/teams", teamsRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/admin", adminRoutes);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(errorHandlerMiddleware);

  return app;
}
