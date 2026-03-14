import assert from "node:assert/strict";
import test from "node:test";
import { PolicyVersionService } from "../src/core/services/compliance/PolicyVersionService.js";

test("PolicyVersionService marks the latest version as current", () => {
  const service = new PolicyVersionService();
  service.createVersion({
    id: "pv1",
    policyId: "policy-1",
    tenantId: "tenant-acme",
    versionLabel: "v1",
    documentReference: "doc-v1",
    effectiveDate: new Date("2026-01-01"),
    isCurrent: true
  });
  service.createVersion({
    id: "pv2",
    policyId: "policy-1",
    tenantId: "tenant-acme",
    versionLabel: "v2",
    documentReference: "doc-v2",
    effectiveDate: new Date("2026-02-01"),
    isCurrent: true
  });

  const history = service.listVersionHistory("policy-1");
  assert.equal(history[0]?.id, "pv2");
  assert.equal(history[0]?.isCurrent, true);
  assert.equal(history[1]?.isCurrent, false);
});
