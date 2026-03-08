import assert from "node:assert/strict";
import test from "node:test";
import { PromptEngine } from "../src/prompt/PromptEngine.js";
import { ProjectSummaryWorkflow } from "../src/core/services/workflows/projectSummaryWorkflow.js";
import { createTestSystem } from "./helpers.js";

test("ProjectSummaryWorkflow returns structured summary output", async () => {
  const { tenantContextService, projectContextService } = await createTestSystem();
  const tenantContext = await tenantContextService.resolve("tenant-test");
  const projectContext = await projectContextService.getProjectContext(tenantContext, "project-test");
  const workflow = new ProjectSummaryWorkflow(new PromptEngine());

  const result = await workflow.execute({
    tenantContext,
    projectContext,
    userRequest: "Provide a project overview for leadership",
    workflowId: "project_summary",
    timestamp: new Date(),
    metadata: { contextType: "executive_summary" }
  });

  assert.equal(result.resultType, "project_summary");
  const data = result.data as any;
  assert.ok(typeof data.projectOverview === "string");
  assert.ok(["green", "amber", "red", "unknown"].includes(data.deliveryHealth));
  assert.ok(Array.isArray(data.recommendedFocus));
  assert.ok(data.generatedAt);
});

test("ProjectSummaryWorkflow maps project status to delivery health in fallback", async () => {
  const { tenantContextService, projectContextService } = await createTestSystem();
  const tenantContext = await tenantContextService.resolve("tenant-test");
  const projectContext = await projectContextService.getProjectContext(tenantContext, "project-test");
  projectContext.statusSummary = "On Track";
  const workflow = new ProjectSummaryWorkflow(new PromptEngine());

  const result = await workflow.execute({
    tenantContext,
    projectContext,
    userRequest: "Project summary",
    workflowId: "project_summary",
    timestamp: new Date()
  });

  const data = result.data as any;
  assert.ok(["green", "amber", "red", "unknown"].includes(data.deliveryHealth));
});
