import assert from "node:assert/strict";
import test from "node:test";
import { AdaptiveCardRenderer } from "../src/integrations/teams/AdaptiveCardRenderer.js";
import { TeamsAuthService } from "../src/integrations/teams/TeamsAuthService.js";
import { TeamsBotController } from "../src/integrations/teams/TeamsBotController.js";
import type { AgentExecutor, TeamsMessageRouteResult } from "../src/integrations/teams/types.js";

class MockMessageRouter {
  async route(): Promise<TeamsMessageRouteResult> {
    return {
      tenantId: "tenant-acme",
      message: "What should I do next for onboarding?",
      metadata: { source: "teams" }
    };
  }
}

class MockAgentExecutor implements AgentExecutor {
  goalExecuted = false;

  async goalExecute() {
    this.goalExecuted = true;
    return {
      planId: "plan-1",
      goalType: "onboarding_guidance",
      plannerConfidence: 0.9,
      stopReason: "completed",
      stepExecutions: [],
      response: {
        goalSummary: "Onboarding next step request",
        workflowsExecuted: ["next_training_step", "compliance_audit"],
        synthesizedSummary: "Complete the next assigned course and acknowledge the pending policy.",
        keyFindings: ["Kitchen Hygiene Lesson 3 is pending"],
        recommendedActions: ["Open the assigned course"],
        assumptionsMade: [],
        warnings: [],
        generatedAt: new Date()
      }
    } as any;
  }
}

class MockUsageLogService {
  async recordWorkflowRequest(): Promise<void> {
    return;
  }
}

function mockReq(body: any): any {
  return { body, query: {} };
}

function mockRes() {
  return {
    statusCode: 200,
    payload: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.payload = payload;
      return this;
    }
  };
}

test("TeamsBotController processes onboarding assistant message and returns adaptive card response", async () => {
  const executor = new MockAgentExecutor();
  const controller = new TeamsBotController(
    new TeamsAuthService(),
    new MockMessageRouter() as any,
    executor,
    new AdaptiveCardRenderer(),
    new MockUsageLogService() as any
  );
  const req = mockReq({
    type: "message",
    text: "What should I do next for onboarding?",
    from: { id: "teams-user-1" },
    channelData: { tenant: { id: "teams-tenant-1" } }
  });
  const res = mockRes();

  await controller.handleMessage(req as any, res as any);

  assert.equal(res.statusCode, 200);
  assert.equal(executor.goalExecuted, true);
  assert.ok(Array.isArray(res.payload.attachments));
});

test("TeamsBotController keeps Teams assistant responses in onboarding/compliance context", async () => {
  const executor = new MockAgentExecutor();
  const controller = new TeamsBotController(
    new TeamsAuthService(),
    {
      async route(): Promise<TeamsMessageRouteResult> {
        return {
          tenantId: "tenant-acme",
          message: "What am I missing for compliance?",
          metadata: { source: "teams" }
        };
      }
    } as any,
    executor,
    new AdaptiveCardRenderer(),
    new MockUsageLogService() as any
  );
  const req = mockReq({
    type: "message",
    text: "What am I missing for compliance?",
    from: { id: "teams-user-1" },
    channelData: { tenant: { id: "teams-tenant-1" } }
  });
  const res = mockRes();

  await controller.handleMessage(req as any, res as any);

  assert.equal(res.statusCode, 200);
  assert.equal(executor.goalExecuted, true);
});
