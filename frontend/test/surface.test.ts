import assert from "node:assert/strict";
import test from "node:test";
import { resolveAppSurface } from "../src/surface";

test("resolveAppSurface routes admin, teams, and pwa paths", () => {
  assert.equal(resolveAppSurface("/admin"), "admin");
  assert.equal(resolveAppSurface("/teams"), "teams");
  assert.equal(resolveAppSurface("/"), "pwa");
});
