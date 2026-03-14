import assert from "node:assert/strict";
import test from "node:test";
import { AgenticOrchestratorService } from "../src/core/services/agentic/AgenticOrchestratorService.js";
import { AgentPlannerService } from "../src/core/services/agentic/AgentPlannerService.js";
import { ResultSynthesisService } from "../src/core/services/agentic/ResultSynthesisService.js";
import type { WorkflowResult } from "../src/core/services/workflows/baseWorkflow.js";
import { WorkflowRegistry } from "../src/core/services/workflows/workflowRegistry.js";
import {
  MemoryLicenseRepository,
  MemoryProjectRepository,
  MemoryPromptMappingRepository,
  MemoryTenantRepository
} from "../src/core/repositories/memory/MemoryRepositories.js";
import { ConnectorRouter } from "../src/core/services/ConnectorRouter.js";
import { LicenseService } from "../src/core/services/LicenseService.js";
import { ProjectContextService } from "../src/core/services/ProjectContextService.js";
import { TenantContextService } from "../src/core/services/TenantContextService.js";
import { TenantService } from "../src/core/services/TenantService.js";
import { stubConnectors } from "../src/core/connectors/StubConnectors.js";

test("AgenticOrchestratorService executes planned steps in sequence", async () => {
  const tenantRepository = new MemoryTenantRepository();
  const licenseRepository = new MemoryLicenseRepository();
  const promptMappingRepository = new MemoryPromptMappingRepository();
  const projectRepository = new MemoryProjectRepository();

  const tenantService = new TenantService(tenantRepository, licenseRepository, promptMappingRepository);
  const licenseService = new LicenseService(licenseRepository, tenantRepository);
  const tenantContextService = new TenantContextService(tenantService, licenseService);
  const projectContextService = new ProjectContextService(
    projectRepository,
    new ConnectorRouter(stubConnectors)
  );

  await tenantService.createTenant({
    tenantId: "tenant-test",
    organizationName: "Test Org",
    status: "active",
    licenseStatus: "active",
    planType: "professional",
    defaultPromptVersion: "weekly_report:v1",
    enabledConnectors: ["clickup"],
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
  await projectRepository.upsert({
    projectId: "project-test",
    tenantId: "tenant-test",
    sourceSystem: "clickup",
    externalProjectId: "ext-test",
    name: "Test Project",
    deliveryMode: "hybrid"
  });

  const registry = new WorkflowRegistry();
  const order: string[] = [];
  const makeWorkflow = (
    id: "project_summary" | "delivery_advisor"
  ): any => ({
    id,
    name: id,
    description: id,
    supportedInputTypes: ["text"],
    async execute(): Promise<WorkflowResult> {
      order.push(id);
      return {
        workflowId: id,
        resultType: id === "project_summary" ? "project_summary" : "delivery_advisor",
        data: {
          projectOverview: `${id} overview`,
          recommendedActions: [`${id} action`],
          warnings: []
        } as any,
        generatedAt: new Date(),
        confidenceScore: 0.8,
        warnings: []
      };
    }
  });

  registry.register(makeWorkflow("project_summary"));
  registry.register(makeWorkflow("delivery_advisor"));

  const orchestrator = new AgenticOrchestratorService(
    new AgentPlannerService(registry),
    registry,
    tenantContextService,
    projectContextService,
    projectRepository,
    new ResultSynthesisService()
  );

  const result = await orchestrator.executeGoal({
    tenantId: "tenant-test",
    projectId: "project-test",
    message: "Give me project overview and what should I do next"
  });

  assert.ok(result.stepExecutions.length >= 1);
  assert.equal(order[0], "project_summary");
  assert.ok(result.response.synthesizedSummary.length > 0);
});
