import assert from "node:assert/strict";
import test from "node:test";
import { AcknowledgementService } from "../src/core/services/compliance/AcknowledgementService.js";
import { ComplianceConfigService } from "../src/core/services/compliance/ComplianceConfigService.js";

test("AcknowledgementService records acknowledgement evidence", () => {
  const service = new AcknowledgementService();
  const config = new ComplianceConfigService().getConfig("tenant-acme");
  const record = service.recordAcknowledgement(
    {
      id: "ack-1",
      tenantId: "tenant-acme",
      userId: "user-1",
      subjectType: "policy",
      subjectId: "policy-1",
      acknowledgementType: "accepted",
      status: "completed",
      recordedAt: new Date()
    },
    config,
    false
  );

  assert.equal(record.id, "ack-1");
  assert.equal(service.findHistory({ tenantId: "tenant-acme", userId: "user-1" }).length, 1);
});
