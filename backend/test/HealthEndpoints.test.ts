import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

test("health endpoints return expected liveness and readiness payloads", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const live = await fetch(`${base}/health/live`);
    assert.equal(live.status, 200);
    const liveBody = (await live.json()) as { status: string };
    assert.equal(liveBody.status, "live");

    const ready = await fetch(`${base}/health/ready`);
    assert.equal(ready.status, 200);
    const readyBody = (await ready.json()) as { status: string };
    assert.equal(readyBody.status, "ready");
  } finally {
    server.close();
  }
});
