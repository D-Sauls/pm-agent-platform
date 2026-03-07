import assert from "node:assert/strict";
import test from "node:test";
import { PromptEngine } from "../src/prompt/PromptEngine.js";
import { ChangeAssessmentWorkflow } from "../src/core/services/workflows/changeAssessmentWorkflow.js";
import { createTestSystem } from "./helpers.js";

test("ChangeAssessmentWorkflow returns structured output", async () => {
  const { tenantContextService, projectContextService } = await createTestSystem();
  const tenantContext = await tenantContextService.resolve("tenant-test");
  const projectContext = await projectContextService.getProjectContext(tenantContext, "project-test");
  const workflow = new ChangeAssessmentWorkflow(new PromptEngine());

  const result = await workflow.execute({
    tenantContext,
    projectContext,
    userRequest: "Assess this change request: add approval workflow to this module",
    workflowId: "change_assessment",
    timestamp: new Date(),
    metadata: { sourceType: "client_request" }
  });

  assert.equal(result.resultType, "change_assessment");
  const data = result.data as any;
  assert.ok(data.changeSummary);
  assert.ok(data.impactAssessment.scopeClassification);
});

test("ChangeAssessmentWorkflow validates empty change text", async () => {
  const { tenantContextService, projectContextService } = await createTestSystem();
  const tenantContext = await tenantContextService.resolve("tenant-test");
  const projectContext = await projectContextService.getProjectContext(tenantContext, "project-test");
  const workflow = new ChangeAssessmentWorkflow(new PromptEngine());

  await assert.rejects(
    workflow.execute({
      tenantContext,
      projectContext,
      userRequest: "",
      workflowId: "change_assessment",
      timestamp: new Date()
    })
  );
});

test("ChangeAssessmentWorkflow delivery mode handling includes governance language", async () => {
  const { tenantContextService, projectContextService } = await createTestSystem();
  const tenantContext = await tenantContextService.resolve("tenant-test");
  const projectContext = await projectContextService.getProjectContext(tenantContext, "project-test");
  projectContext.project.deliveryMode = "waterfall";
  const workflow = new ChangeAssessmentWorkflow(new PromptEngine());

  const result = await workflow.execute({
    tenantContext,
    projectContext,
    userRequest: "evaluate this scope change",
    workflowId: "change_assessment",
    timestamp: new Date()
  });
  const governanceImpact = (result.data as any).impactAssessment.governanceImpact.join(" ").toLowerCase();
  assert.ok(governanceImpact.includes("change control") || governanceImpact.includes("approval"));
});
