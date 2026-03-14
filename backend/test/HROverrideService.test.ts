import assert from "node:assert/strict";
import test from "node:test";
import { ComplianceConfigService } from "../src/core/services/compliance/ComplianceConfigService.js";
import { HROverrideService } from "../src/core/services/compliance/HROverrideService.js";

test("HROverrideService blocks overrides when disabled", () => {
  const service = new HROverrideService();
  const configService = new ComplianceConfigService();
  const config = configService.upsertConfig("tenant-acme", { hrOverrideEnabled: false });

  assert.throws(() => {
    service.createOverride(
      {
        id: "override-1",
        tenantId: "tenant-acme",
        userId: "user-1",
        subjectType: "course",
        subjectId: "course-1",
        overriddenBy: "hr-user",
        reason: "Imported from HRIS",
        recordedAt: new Date()
      },
      config
    );
  });
});
