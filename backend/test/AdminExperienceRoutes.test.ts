import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

async function loginAsLocalAdmin(base: string): Promise<string> {
  const response = await fetch(`${base}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@local.dev", password: "ChangeMe123!" })
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { token: string };
  return body.token;
}

test("admin experience APIs expose onboarding/compliance data after HR import", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Failed to resolve server port");
    const base = `http://127.0.0.1:${address.port}`;

    const unauthorized = await fetch(`${base}/api/admin/experience/dashboard?tenantId=tenant-acme`);
    assert.equal(unauthorized.status, 401);

    const token = await loginAsLocalAdmin(base);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const employeeCode = `EMP-${Date.now()}`;
    const csv = [
      "employeeCode,firstName,lastName,workEmail,department,roleName,startDate",
      `${employeeCode},Sam,AdminTest,${employeeCode.toLowerCase()}@example.com,Finance,Finance Analyst,2026-04-25`
    ].join("\n");

    const upload = await fetch(`${base}/api/admin/hr-import/jobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        tenantId: "tenant-acme",
        fileName: "admin-experience-test.csv",
        fileType: "csv",
        fileContentBase64: Buffer.from(csv, "utf8").toString("base64")
      })
    });
    assert.equal(upload.status, 201);
    const uploadBody = (await upload.json()) as { job: { id: string }; rows: Array<{ validationStatus: string }> };
    assert.notEqual(uploadBody.rows[0].validationStatus, "invalid");

    const process = await fetch(`${base}/api/admin/hr-import/jobs/${uploadBody.job.id}/process`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tenantId: "tenant-acme" })
    });
    assert.equal(process.status, 200);

    const dashboard = await fetch(`${base}/api/admin/experience/dashboard?tenantId=tenant-acme`, { headers });
    assert.equal(dashboard.status, 200);
    const dashboardBody = (await dashboard.json()) as { kpis: { totalEmployees: number } };
    assert.ok(dashboardBody.kpis.totalEmployees >= 1);

    const employees = await fetch(`${base}/api/admin/experience/employees?tenantId=tenant-acme`, { headers });
    assert.equal(employees.status, 200);
    const employeesBody = (await employees.json()) as { employees: Array<{ id: string; employeeCode: string }> };
    const importedEmployee = employeesBody.employees.find((employee) => employee.employeeCode === employeeCode);
    assert.ok(importedEmployee);

    const detail = await fetch(`${base}/api/admin/experience/employees/${importedEmployee.id}?tenantId=tenant-acme`, { headers });
    assert.equal(detail.status, 200);
    const detailBody = (await detail.json()) as { employee: { assignedPolicies: Array<{ id: string }>; acknowledgementTimeline: unknown[]; auditLog: unknown[] } };
    assert.ok(Array.isArray(detailBody.employee.assignedPolicies));
    assert.ok(Array.isArray(detailBody.employee.acknowledgementTimeline));
    assert.ok(Array.isArray(detailBody.employee.auditLog));

    const overrideSubjectId = detailBody.employee.assignedPolicies[0]?.id ?? "policy-finance-controls";
    const override = await fetch(`${base}/api/admin/experience/employees/${importedEmployee.id}/overrides`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        tenantId: "tenant-acme",
        subjectType: "policy",
        subjectId: overrideSubjectId,
        reason: "Validation test override reason"
      })
    });
    assert.equal(override.status, 201);
    const overrideBody = (await override.json()) as { employee: { auditLog: Array<{ reason?: string }> } };
    assert.ok(overrideBody.employee.auditLog.some((entry) => entry.reason === "Validation test override reason"));

    const content = await fetch(`${base}/api/admin/experience/content?tenantId=tenant-acme`, { headers });
    assert.equal(content.status, 200);
    const contentBody = (await content.json()) as { policies: unknown[]; courses: unknown[] };
    assert.ok(Array.isArray(contentBody.policies));
    assert.ok(Array.isArray(contentBody.courses));

    const settings = await fetch(`${base}/api/admin/experience/settings?tenantId=tenant-acme`, { headers });
    assert.equal(settings.status, 200);
    const settingsBody = (await settings.json()) as { tenantId: string; downloadPolicy: string };
    assert.equal(settingsBody.tenantId, "tenant-acme");
    assert.equal(typeof settingsBody.downloadPolicy, "string");
  } finally {
    server.close();
  }
});

