import assert from "node:assert/strict";
import test from "node:test";
import { AgenticOrchestratorService } from "../src/core/services/agentic/AgenticOrchestratorService.js";
import { AgentPlannerService } from "../src/core/services/agentic/AgentPlannerService.js";
import { ResultSynthesisService } from "../src/core/services/agentic/ResultSynthesisService.js";
import type { WorkflowResult } from "../src/core/services/workflows/baseWorkflow.js";
import { WorkflowRegistry } from "../src/core/services/workflows/workflowRegistry.js";
import {
  MemoryLicenseRepository,
  MemoryPromptMappingRepository,
  MemoryTenantRepository
} from "../src/core/repositories/memory/MemoryRepositories.js";
import { LicenseService } from "../src/core/services/LicenseService.js";
import { TenantContextService } from "../src/core/services/TenantContextService.js";
import { TenantService } from "../src/core/services/TenantService.js";

test("AgenticOrchestratorService executes planned steps in sequence", async () => {
  const tenantRepository = new MemoryTenantRepository();
  const licenseRepository = new MemoryLicenseRepository();
  const promptMappingRepository = new MemoryPromptMappingRepository();

  const tenantService = new TenantService(tenantRepository, licenseRepository, promptMappingRepository);
  const licenseService = new LicenseService(licenseRepository, tenantRepository);
  const tenantContextService = new TenantContextService(tenantService, licenseService);

  await tenantService.createTenant({
    tenantId: "tenant-test",
    organizationName: "Test Org",
    status: "active",
    licenseStatus: "active",
    planType: "professional",
    defaultPromptVersion: "onboarding_assistant:v1",
    enabledConnectors: ["sharepoint"],
    featureFlags: []
  });
  await licenseRepository.upsert({
    tenantId: "tenant-test",
    status: "active",
    planType: "professional",
    expiryDate: null,
    trialEndsAt: null,
    lastValidatedAt: null
  });
  const registry = new WorkflowRegistry();
  const order: string[] = [];
  const makeWorkflow = (
    id: "next_training_step" | "onboarding_recommendation"
  ): any => ({
    id,
    name: id,
    description: id,
    supportedInputTypes: ["text"],
    async execute(): Promise<WorkflowResult> {
      order.push(id);
      return {
        workflowId: id,
        resultType: id,
        data: {
          recommendation: `${id} guidance`,
          nextActions: [`${id} action`],
          warnings: []
        } as any,
        generatedAt: new Date(),
        confidenceScore: 0.8,
        warnings: []
      };
    }
  });

  registry.register(makeWorkflow("next_training_step"));
  registry.register(makeWorkflow("onboarding_recommendation"));

  const orchestrator = new AgenticOrchestratorService(
    new AgentPlannerService(registry),
    registry,
    tenantContextService,
    new ResultSynthesisService()
  );

  const result = await orchestrator.executeGoal({
    tenantId: "tenant-test",
    message: "What should I do next in my onboarding path?"
  });

  assert.ok(result.stepExecutions.length >= 1);
  assert.equal(order[0], "next_training_step");
  assert.ok(result.response.synthesizedSummary.length > 0);
});
