import assert from "node:assert/strict";
import test from "node:test";
import { BillingClassificationService } from "../src/core/services/time/BillingClassificationService.js";

test("BillingClassificationService honors explicit billableStatus", () => {
  const service = new BillingClassificationService();
  const status = service.classify({
    billableStatus: "billable",
    billingCategory: "internal"
  });
  assert.equal(status, "billable");
});

test("BillingClassificationService classifies admin/support category as non-billable", () => {
  const service = new BillingClassificationService();
  const status = service.classify({
    billingCategory: "internal support"
  });
  assert.equal(status, "non_billable");
});

test("BillingClassificationService falls back to unknown when no signal", () => {
  const service = new BillingClassificationService();
  const status = service.classify({
    description: "General work"
  });
  assert.equal(status, "unknown");
});
