import assert from "node:assert/strict";
import test from "node:test";
import { canDownloadByPolicy } from "../src/pwa/offline";

test("canDownloadByPolicy respects tenant download rules", () => {
  assert.equal(canDownloadByPolicy("allow_anywhere").allowed, true);
  assert.equal(canDownloadByPolicy("authenticated_only").allowed, true);
  assert.equal(canDownloadByPolicy("vpn_only").allowed, false);
  assert.equal(canDownloadByPolicy("office_ip_only").allowed, false);
});
