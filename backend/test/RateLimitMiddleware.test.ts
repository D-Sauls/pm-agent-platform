import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import { LoggingService } from "../src/observability/LoggingService.js";
import { rateLimitMiddleware } from "../src/observability/RateLimitMiddleware.js";
import { RateLimitService } from "../src/observability/RateLimitService.js";
import { requestContextMiddleware } from "../src/observability/RequestContextMiddleware.js";

test("rate limit middleware blocks when policy is exceeded", async () => {
  const app = express();
  app.use(requestContextMiddleware);
  app.use(
    rateLimitMiddleware(
      new RateLimitService(),
      new LoggingService("error"),
      () => ({
        name: "test",
        windowMs: 60_000,
        maxRequests: 1
      })
    )
  );
  app.get("/limited", (_req, res) => {
    res.json({ ok: true });
  });

  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const first = await fetch(`${base}/limited`);
    assert.equal(first.status, 200);

    const second = await fetch(`${base}/limited`);
    assert.equal(second.status, 429);
    const body = (await second.json()) as { code: string; requestId?: string };
    assert.equal(body.code, "RATE_LIMITED");
    assert.ok(body.requestId);
  } finally {
    server.close();
  }
});
