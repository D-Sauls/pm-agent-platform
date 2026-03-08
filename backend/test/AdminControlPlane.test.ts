import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

async function loginAsLocalAdmin(base: string): Promise<string> {
  const response = await fetch(`${base}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@local.dev",
      password: "ChangeMe123!"
    })
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { token: string };
  return body.token;
}

test("admin auth guard blocks missing token and allows valid token", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;

    const unauthorized = await fetch(`${base}/api/admin/dashboard`);
    assert.equal(unauthorized.status, 401);

    const token = await loginAsLocalAdmin(base);
    const authorized = await fetch(`${base}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(authorized.status, 200);
  } finally {
    server.close();
  }
});

test("admin dashboard loads summary data", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;
    const token = await loginAsLocalAdmin(base);

    const response = await fetch(`${base}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as any;
    assert.equal(typeof body.totalTenants, "number");
    assert.ok(Array.isArray(body.recentAdminActions));
    assert.ok(Array.isArray(body.topUsedWorkflows));
  } finally {
    server.close();
  }
});

test("tenant suspend and reactivate actions work", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;
    const token = await loginAsLocalAdmin(base);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const suspend = await fetch(`${base}/api/admin/tenants/tenant-acme/suspend`, {
      method: "POST",
      headers
    });
    assert.equal(suspend.status, 200);
    const suspended = (await suspend.json()) as any;
    assert.equal(suspended.licenseStatus, "suspended");

    const reactivate = await fetch(`${base}/api/admin/tenants/tenant-acme/reactivate`, {
      method: "POST",
      headers
    });
    assert.equal(reactivate.status, 200);
    const active = (await reactivate.json()) as any;
    assert.equal(active.licenseStatus, "active");
  } finally {
    server.close();
  }
});

test("license update actions work for superadmin", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;
    const token = await loginAsLocalAdmin(base);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const suspend = await fetch(`${base}/api/admin/licenses/tenant-acme/suspend`, {
      method: "POST",
      headers
    });
    assert.equal(suspend.status, 200);
    const suspended = (await suspend.json()) as any;
    assert.equal(suspended.status, "suspended");

    const activate = await fetch(`${base}/api/admin/licenses/tenant-acme/activate`, {
      method: "POST",
      headers
    });
    assert.equal(activate.status, 200);
    const active = (await activate.json()) as any;
    assert.equal(active.status, "active");
  } finally {
    server.close();
  }
});

test("feature flag tenant override updates", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;
    const token = await loginAsLocalAdmin(base);

    const update = await fetch(`${base}/api/admin/feature-flags/tenant-acme`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        flagKey: "weeklyReportV2",
        enabled: false
      })
    });
    assert.equal(update.status, 200);
    const body = (await update.json()) as any;
    assert.equal(body.flags.weeklyReportV2, false);
  } finally {
    server.close();
  }
});

test("enhancement request status update works", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server port");
    }
    const base = `http://127.0.0.1:${address.port}`;
    const token = await loginAsLocalAdmin(base);
    const authHeaders = { Authorization: `Bearer ${token}` };

    const list = await fetch(`${base}/api/admin/enhancements`, { headers: authHeaders });
    assert.equal(list.status, 200);
    const items = (await list.json()) as Array<{ id: string }>;
    assert.ok(items.length > 0);

    const update = await fetch(`${base}/api/admin/enhancements/${items[0].id}/status`, {
      method: "PATCH",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: "planned" })
    });
    assert.equal(update.status, 200);
    const updated = (await update.json()) as any;
    assert.equal(updated.status, "planned");
  } finally {
    server.close();
  }
});
