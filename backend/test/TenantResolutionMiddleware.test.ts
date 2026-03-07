import assert from "node:assert/strict";
import test from "node:test";
import { tenantResolutionMiddleware } from "../src/core/middleware/TenantResolutionMiddleware.js";
import { createTestSystem } from "./helpers.js";

test("TenantResolutionMiddleware resolves tenant context from header", async () => {
  const { tenantContextService } = await createTestSystem();
  const middleware = tenantResolutionMiddleware(tenantContextService);

  const req = {
    header: (key: string) => (key === "x-tenant-id" ? "tenant-test" : undefined),
    params: {},
    body: {}
  } as any;
  const res = {} as any;

  await new Promise<void>((resolve, reject) => {
    middleware(req, res, (error?: unknown) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  assert.equal(req.tenantContext?.tenant.tenantId, "tenant-test");
});
