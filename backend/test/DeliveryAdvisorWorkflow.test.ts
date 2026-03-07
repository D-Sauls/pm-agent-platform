import assert from "node:assert/strict";
import test from "node:test";
import { PromptEngine } from "../src/prompt/PromptEngine.js";
import { DeliveryAdvisorWorkflow } from "../src/core/services/workflows/deliveryAdvisorWorkflow.js";
import { createTestSystem } from "./helpers.js";

test("DeliveryAdvisorWorkflow returns structured advisory output", async () => {
  const { tenantContextService, projectContextService } = await createTestSystem();
  const tenantContext = await tenantContextService.resolve("tenant-test");
  const projectContext = await projectContextService.getProjectContext(tenantContext, "project-test");
  const workflow = new DeliveryAdvisorWorkflow(new PromptEngine());

  const result = await workflow.execute({
    tenantContext,
    projectContext,
    userRequest: "Where should the PM focus this week?",
    workflowId: "delivery_advisor",
    timestamp: new Date(),
    metadata: { contextType: "priority_review" }
  });

  assert.equal(result.resultType, "delivery_advisor");
  const data = result.data as any;
  assert.ok(Array.isArray(data.priorities));
  assert.ok(Array.isArray(data.risks));
  assert.ok(data.generatedAt);
});

test("DeliveryAdvisorWorkflow handles project context delivery mode", async () => {
  const { tenantContextService, projectContextService } = await createTestSystem();
  const tenantContext = await tenantContextService.resolve("tenant-test");
  const projectContext = await projectContextService.getProjectContext(tenantContext, "project-test");
  projectContext.project.deliveryMode = "waterfall";
  const workflow = new DeliveryAdvisorWorkflow(new PromptEngine());

  const result = await workflow.execute({
    tenantContext,
    projectContext,
    userRequest: "Give delivery recommendations",
    workflowId: "delivery_advisor",
    timestamp: new Date()
  });

  const reminders = ((result.data as any).governanceReminders as string[]).join(" ").toLowerCase();
  assert.ok(reminders.includes("stage") || reminders.includes("governance"));
});
