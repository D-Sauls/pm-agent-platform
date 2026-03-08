import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

test("request context middleware propagates or generates request id", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const provided = await fetch(`${base}/health`, {
      headers: { "x-request-id": "req-provided-123" }
    });
    assert.equal(provided.status, 200);
    assert.equal(provided.headers.get("x-request-id"), "req-provided-123");
    const providedBody = (await provided.json()) as { requestId?: string };
    assert.equal(providedBody.requestId, "req-provided-123");

    const generated = await fetch(`${base}/health`);
    assert.equal(generated.status, 200);
    assert.ok(generated.headers.get("x-request-id"));
  } finally {
    server.close();
  }
});
