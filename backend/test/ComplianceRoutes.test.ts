import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

async function loginAsLocalAdmin(base: string): Promise<string> {
  const response = await fetch(`${base}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@local.dev", password: "ChangeMe123!" })
  });
  const body = (await response.json()) as { token: string };
  return body.token;
}

test("compliance requirement route is protected", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;
    const token = await loginAsLocalAdmin(base);

    const unauthorized = await fetch(`${base}/api/compliance/requirements?tenantId=tenant-acme`, {
      headers: {
        Authorization: "Bearer user-1|tenant-acme",
        "x-tenant-id": "tenant-acme"
      }
    });
    assert.equal(unauthorized.status, 401);

    const authorized = await fetch(`${base}/api/compliance/requirements?tenantId=tenant-acme`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-tenant-id": "tenant-acme"
      }
    });
    assert.equal(authorized.status, 200);
  } finally {
    server.close();
  }
});
