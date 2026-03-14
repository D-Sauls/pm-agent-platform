import { env } from "../config/env.js";
import { ConnectorTelemetryService } from "./ConnectorTelemetryService.js";
import { HealthService } from "./HealthService.js";
import { LoggingService } from "./LoggingService.js";
import { RateLimitService } from "./RateLimitService.js";
import { RetryPolicyService } from "./RetryPolicyService.js";
import { WorkflowTelemetryService } from "./WorkflowTelemetryService.js";
import { AgenticTelemetryService } from "./AgenticTelemetryService.js";

export const loggingService = new LoggingService(env.logLevel);
export const workflowTelemetryService = new WorkflowTelemetryService(loggingService);
export const connectorTelemetryService = new ConnectorTelemetryService(loggingService);
export const agenticTelemetryService = new AgenticTelemetryService(loggingService);
export const retryPolicyService = new RetryPolicyService();
export const rateLimitService = new RateLimitService();
export const healthService = new HealthService(
  connectorTelemetryService,
  () => true
);
