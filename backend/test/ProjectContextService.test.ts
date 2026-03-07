import assert from "node:assert/strict";
import test from "node:test";
import { createTestSystem } from "./helpers.js";

test("ProjectContextService returns normalized context", async () => {
  const { tenantContextService, projectContextService } = await createTestSystem();
  const tenantContext = await tenantContextService.resolve("tenant-test");
  const context = await projectContextService.getProjectContext(tenantContext, "project-test");
  assert.equal(context.project.projectId, "ext-test");
  assert.ok(context.tasks.length > 0);
});
