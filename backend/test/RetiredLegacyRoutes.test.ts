import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { employeeSessionService } from "../src/core/services/auth/EmployeeSessionService.js";

function listen(app: ReturnType<typeof createApp>): Promise<{ base: string; close: () => Promise<void> }> {
  const server = app.listen(0);
  return new Promise((resolve, reject) => {
    server.once("listening", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to resolve test port"));
        return;
      }
      resolve({
        base: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(() => done()))
      });
    });
    server.once("error", reject);
  });
}

test("retired PM/time/billing/forecast/ClickUp routes return 410 in onboarding runtime", async () => {
  const app = createApp();
  const server = await listen(app);
  const token = employeeSessionService.issueSession({
    userId: "retired-route-user",
    tenantId: "tenant-acme",
    role: "employee",
    roleName: "Finance Analyst",
    department: "Finance"
  });
  const retiredRoutes: Array<{ method: string; path: string }> = [
    { method: "GET", path: "/api/projects/project-alpha/context?tenantId=tenant-acme" },
    { method: "POST", path: "/api/workflows/weekly-report" },
    { method: "POST", path: "/api/workflows/raid-extraction" },
    { method: "POST", path: "/api/workflows/change-assessment" },
    { method: "POST", path: "/api/workflows/delivery-advisor" },
    { method: "POST", path: "/api/workflows/project-summary" },
    { method: "POST", path: "/api/workflows/forecast" },
    { method: "POST", path: "/api/workflows/weekly-time-report" },
    { method: "POST", path: "/api/workflows/monthly-billing-summary" },
    { method: "POST", path: "/api/agent/execute" },
    { method: "POST", path: "/api/time-entries" },
    { method: "GET", path: "/api/time/summary?tenantId=tenant-acme" },
    { method: "GET", path: "/api/time/resource-summary?tenantId=tenant-acme" },
    { method: "GET", path: "/api/connectors/clickup/health?tenantId=tenant-acme" },
    { method: "POST", path: "/api/connectors/clickup/test-sync" }
  ];

  try {
    for (const route of retiredRoutes) {
      const response = await fetch(`${server.base}${route.path}`, {
        method: route.method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-tenant-id": "tenant-acme"
        },
        body: route.method === "GET" ? undefined : JSON.stringify({ tenantId: "tenant-acme" })
      });
      assert.equal(response.status, 410, `${route.method} ${route.path}`);
      const body = (await response.json()) as { code?: string };
      assert.equal(body.code, "ROUTE_RETIRED", `${route.method} ${route.path}`);
    }
  } finally {
    await server.close();
  }
});

test("retired routes are not hidden behind employee auth failures", async () => {
  const app = createApp();
  const server = await listen(app);
  try {
    const response = await fetch(`${server.base}/api/workflows/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": "tenant-acme" },
      body: JSON.stringify({ tenantId: "tenant-acme" })
    });

    assert.equal(response.status, 410);
  } finally {
    await server.close();
  }
});
