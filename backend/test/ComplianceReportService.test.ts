import assert from "node:assert/strict";
import test from "node:test";
import { ComplianceReportService } from "../src/core/services/compliance/ComplianceReportService.js";

test("ComplianceReportService summarizes tenant compliance", () => {
  const service = new ComplianceReportService();
  const summary = service.tenantSummary("tenant-acme", [
    {
      tenantId: "tenant-acme",
      userId: "user-1",
      requirementId: "req-1",
      status: "completed"
    },
    {
      tenantId: "tenant-acme",
      userId: "user-2",
      requirementId: "req-2",
      status: "overdue"
    }
  ]);

  assert.equal(summary.completed, 1);
  assert.equal(summary.overdue, 1);
});
