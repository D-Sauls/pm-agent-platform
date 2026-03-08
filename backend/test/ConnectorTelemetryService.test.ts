import assert from "node:assert/strict";
import test from "node:test";
import { ConnectorTelemetryService } from "../src/observability/ConnectorTelemetryService.js";
import { LoggingService } from "../src/observability/LoggingService.js";

test("ConnectorTelemetryService tracks status transitions and failures", () => {
  const service = new ConnectorTelemetryService(new LoggingService("error"));

  const healthy = service.record({
    requestId: "req-1",
    tenantId: "tenant-acme",
    connectorName: "clickup",
    operation: "health_check",
    status: "healthy",
    responseTimeMs: 120
  });
  assert.equal(healthy.transitioned, false);

  const degraded = service.record({
    requestId: "req-2",
    tenantId: "tenant-acme",
    connectorName: "clickup",
    operation: "health_check",
    status: "degraded",
    responseTimeMs: 140,
    reason: "timeout"
  });
  assert.equal(degraded.transitioned, true);

  const failures = service.recentFailures(10);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].status, "degraded");
});
