import assert from "node:assert/strict";
import test from "node:test";
import { PromptEngine } from "../src/prompt/PromptEngine.js";
import { RaidExtractionWorkflow } from "../src/core/services/workflows/raidExtractionWorkflow.js";
import { createTestSystem } from "./helpers.js";

test("RaidExtractionWorkflow returns structured RAID arrays", async () => {
  const { tenantContextService, projectContextService } = await createTestSystem();
  const tenantContext = await tenantContextService.resolve("tenant-test");
  const projectContext = await projectContextService.getProjectContext(tenantContext, "project-test");

  const workflow = new RaidExtractionWorkflow(new PromptEngine());
  const result = await workflow.execute({
    tenantContext,
    projectContext,
    userRequest: "Meeting notes: risk around vendor delay, issue in testing environment.",
    workflowId: "raid_extraction",
    timestamp: new Date(),
    metadata: { sourceType: "meeting_notes" }
  });

  assert.equal(result.workflowId, "raid_extraction");
  assert.equal(result.resultType, "raid_extraction");
  const data = result.data as any;
  assert.ok(Array.isArray(data.risks));
  assert.ok(Array.isArray(data.issues));
  assert.ok(data.generatedAt);
});

test("RaidExtractionWorkflow validates empty input", async () => {
  const { tenantContextService, projectContextService } = await createTestSystem();
  const tenantContext = await tenantContextService.resolve("tenant-test");
  const projectContext = await projectContextService.getProjectContext(tenantContext, "project-test");
  const workflow = new RaidExtractionWorkflow(new PromptEngine());

  await assert.rejects(
    workflow.execute({
      tenantContext,
      projectContext,
      userRequest: "",
      workflowId: "raid_extraction",
      timestamp: new Date()
    })
  );
});
