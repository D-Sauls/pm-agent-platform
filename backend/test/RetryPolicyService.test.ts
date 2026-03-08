import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../src/core/errors/AppError.js";
import { RetryPolicyService } from "../src/observability/RetryPolicyService.js";

test("RetryPolicyService retries transient failures and eventually succeeds", async () => {
  const service = new RetryPolicyService();
  let attempts = 0;

  const result = await service.execute("transient.operation", async () => {
    attempts += 1;
    if (attempts < 2) {
      throw new Error("network timeout");
    }
    return "ok";
  });

  assert.equal(result, "ok");
  assert.equal(attempts, 2);
});

test("RetryPolicyService does not retry connector auth failures", async () => {
  const service = new RetryPolicyService();
  let attempts = 0;

  await assert.rejects(
    () =>
      service.execute("auth.failure", async () => {
        attempts += 1;
        throw new AppError("CONNECTOR_AUTH_FAILED", "bad token", 401);
      }),
    /bad token/
  );
  assert.equal(attempts, 1);
});
