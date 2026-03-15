import assert from "node:assert/strict";
import test from "node:test";
import { resolveTenantBranding } from "../src/pwa/branding";

test("resolveTenantBranding returns tenant preset or fallback", () => {
  assert.equal(resolveTenantBranding("tenant-acme").appName, "Acme Learning Hub");
  assert.equal(resolveTenantBranding("unknown", "Contoso").logoText, "CO");
});
