import assert from "node:assert/strict";
import test from "node:test";
import { ComplianceConfigService } from "../src/core/services/compliance/ComplianceConfigService.js";
import { ComplianceTrackingService } from "../src/core/services/compliance/ComplianceTrackingService.js";

test("ComplianceTrackingService marks mandatory requirements overdue after due date", () => {
  const service = new ComplianceTrackingService();
  const config = new ComplianceConfigService().getConfig("tenant-acme");

  const statuses = service.calculateStatuses({
    tenantId: "tenant-acme",
    userId: "user-1",
    requirements: [
      {
        id: "req-1",
        tenantId: "tenant-acme",
        requirementType: "policy",
        requirementId: "policy-1",
        appliesToRoles: ["Employee"],
        mandatory: true,
        dueInDays: -1,
        acknowledgementRequired: true,
        signatureRequired: false
      }
    ],
    acknowledgements: [],
    now: new Date("2026-03-14T00:00:00Z"),
    config
  });

  assert.equal(statuses[0]?.status, "overdue");
});
