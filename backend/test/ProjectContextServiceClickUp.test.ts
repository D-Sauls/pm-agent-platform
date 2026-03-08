import assert from "node:assert/strict";
import test from "node:test";
import type { BaseConnector } from "../src/core/connectors/BaseConnector.js";
import { ConnectorRouter } from "../src/core/services/ConnectorRouter.js";
import { ProjectContextService } from "../src/core/services/ProjectContextService.js";
import { TimeEntryService } from "../src/core/services/time/TimeEntryService.js";
import { BillingClassificationService } from "../src/core/services/time/BillingClassificationService.js";
import {
  MemoryProjectRepository,
  MemoryTimeEntryRepository
} from "../src/core/repositories/memory/MemoryRepositories.js";
import type { TenantContext } from "../src/core/models/tenantModels.js";

class MockClickUpConnector implements BaseConnector {
  readonly sourceSystem = "clickup";
  async getProject(tenantContext: TenantContext, projectId: string) {
    return {
      projectId,
      tenantId: tenantContext.tenant.tenantId,
      sourceSystem: "clickup",
      externalProjectId: projectId,
      name: "ClickUp Project",
      deliveryMode: "hybrid" as const
    };
  }
  async getTasks(_tenantContext: TenantContext, projectId: string) {
    return [{ taskId: "t1", projectId, sourceSystem: "clickup", title: "Task 1" }];
  }
  async getMilestones(_tenantContext: TenantContext, projectId: string) {
    return [{ milestoneId: "m1", projectId, sourceSystem: "clickup", title: "Milestone 1" }];
  }
  async getStatus() {
    return "Amber";
  }
  async getTimeEntries(tenantContext: TenantContext, projectId: string) {
    return [
      {
        timeEntryId: "te1",
        tenantId: tenantContext.tenant.tenantId,
        projectId,
        sourceSystem: "clickup",
        entryDate: new Date(),
        hours: 2,
        billableStatus: "billable" as const
      }
    ];
  }
  async healthCheck(tenantContext: TenantContext) {
    return {
      connectorName: "clickup",
      tenantId: tenantContext.tenant.tenantId,
      status: "healthy" as const,
      checkedAt: new Date(),
      message: "ok"
    };
  }
}

function tenantContext(): TenantContext {
  return {
    tenant: {
      tenantId: "tenant-test",
      organizationName: "Test",
      status: "active",
      licenseStatus: "active",
      planType: "professional",
      createdDate: new Date(),
      updatedDate: new Date(),
      defaultPromptVersion: null,
      enabledConnectors: ["clickup"],
      featureFlags: []
    },
    license: {
      tenantId: "tenant-test",
      status: "active",
      planType: "professional",
      expiryDate: null,
      trialEndsAt: null,
      lastValidatedAt: null
    },
    enabledConnectors: ["clickup"],
    defaultPromptVersion: null,
    featureFlags: []
  };
}

test("ProjectContextService integrates ClickUp connector and includes time entries", async () => {
  const projectRepo = new MemoryProjectRepository();
  await projectRepo.upsert({
    projectId: "project-test",
    tenantId: "tenant-test",
    sourceSystem: "clickup",
    externalProjectId: "list-1",
    name: "Project Test",
    deliveryMode: "hybrid"
  });
  const timeEntryService = new TimeEntryService(
    new MemoryTimeEntryRepository(),
    new BillingClassificationService()
  );
  const service = new ProjectContextService(
    projectRepo,
    new ConnectorRouter([new MockClickUpConnector()]),
    timeEntryService
  );

  const context = await service.getProjectContext(tenantContext(), "project-test");
  assert.equal(context.project.sourceSystem, "clickup");
  assert.equal(context.tasks.length, 1);
  assert.equal(context.milestones.length, 1);
  assert.ok((context.timeEntries ?? []).length > 0);
});
