import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { repositories } from "./core/container.js";
import { errorHandlerMiddleware } from "./core/middleware/ErrorHandlerMiddleware.js";
import { authenticateUser } from "./middleware/AuthMiddleware.js";
import { tenantMiddleware } from "./middleware/TenantMiddleware.js";
import { rateLimitMiddleware } from "./observability/RateLimitMiddleware.js";
import { requestContextMiddleware } from "./observability/RequestContextMiddleware.js";
import { requestLifecycleMiddleware } from "./observability/RequestLifecycleMiddleware.js";
import {
  connectorTelemetryService,
  healthService,
  loggingService,
  rateLimitService,
  workflowTelemetryService
} from "./observability/runtime.js";
import { adminRoutes } from "./routes/admin/index.js";
import { agentRoutes } from "./routes/agentRoutes.js";
import { productRoutes } from "./routes/productRoutes.js";
import { teamsRoutes } from "./routes/teamsRoutes.js";

export function createApp() {
  const app = express();
  healthService.setStorageReadyProbe(() => Object.keys(repositories).length > 0);

  app.use(cors());
  app.use(requestContextMiddleware);
  app.use(requestLifecycleMiddleware(loggingService, workflowTelemetryService, connectorTelemetryService));
  app.use(express.json());
  app.use(
    rateLimitMiddleware(rateLimitService, loggingService, (req) => {
      if (req.path.startsWith("/api/admin") || req.path.startsWith("/admin")) {
        return {
          name: "admin",
          windowMs: env.rateLimitWindowMs,
          maxRequests: env.rateLimitAdminMax
        };
      }
      if (req.path.startsWith("/api/agent")) {
        return {
          name: "agent",
          windowMs: env.rateLimitWindowMs,
          maxRequests: env.rateLimitAgentMax
        };
      }
      if (req.path.startsWith("/api/workflows")) {
        return {
          name: "workflows",
          windowMs: env.rateLimitWindowMs,
          maxRequests: env.rateLimitWorkflowMax
        };
      }
      return null;
    })
  );

  app.use("/api/agent", authenticateUser, tenantMiddleware, agentRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/teams", teamsRoutes);
  app.use("/api", productRoutes);
  app.use("/admin", adminRoutes);

  app.get("/health/live", (_req, res) => {
    res.json(healthService.live());
  });

  app.get("/health/ready", (_req, res) => {
    const ready = healthService.ready();
    res.status(ready.status === "ready" ? 200 : 503).json(ready);
  });

  app.get("/health", (req, res) => {
    const live = healthService.live();
    const ready = healthService.ready();
    res.status(ready.status === "ready" ? 200 : 503).json({
      status: ready.status === "ready" ? "ok" : "degraded",
      requestId: req.requestId,
      live,
      ready
    });
  });

  app.use(errorHandlerMiddleware);

  return app;
}
