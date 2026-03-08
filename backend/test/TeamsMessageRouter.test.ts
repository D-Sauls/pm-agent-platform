import assert from "node:assert/strict";
import test from "node:test";
import { TeamsMessageRouter } from "../src/integrations/teams/TeamsMessageRouter.js";
import type { ProjectRepository } from "../src/core/repositories/interfaces.js";

class MockProjectRepo implements ProjectRepository {
  async upsert(project: any): Promise<any> {
    return project;
  }
  async getById(): Promise<any> {
    return null;
  }
  async listByTenant(tenantId: string): Promise<any[]> {
    return [{ projectId: `${tenantId}-project-1` }];
  }
}

test("TeamsMessageRouter parses explicit project token", async () => {
  const router = new TeamsMessageRouter(new MockProjectRepo() as ProjectRepository);
  const result = await router.route("tenant-acme", {
    type: "message",
    text: "project project-alpha generate weekly report"
  });

  assert.equal(result.projectId, "project-alpha");
  assert.ok(result.message.includes("generate weekly report"));
});

test("TeamsMessageRouter falls back to default tenant project", async () => {
  const router = new TeamsMessageRouter(new MockProjectRepo() as ProjectRepository);
  const result = await router.route("tenant-acme", {
    type: "message",
    text: "summarize this project"
  });

  assert.equal(result.projectId, "tenant-acme-project-1");
});
