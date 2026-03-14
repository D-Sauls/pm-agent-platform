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
      projectId: "project-alpha",
      message: "generate weekly report"
    };
  }
}

class MockAgentExecutor implements AgentExecutor {
  goalExecuted = false;

  async execute() {
    return {
      workflowId: "weekly_report",
      confidenceScore: 0.95,
      connectorUsed: "monday",
      result: {
        workflowId: "weekly_report",
        resultType: "report",
        generatedAt: new Date(),
        confidenceScore: 0.95,
        warnings: [],
        data: {
          recommendations: ["Follow up on dependencies"]
        }
      } as any
    };
  }

  async goalExecute() {
    this.goalExecuted = true;
    return {
      planId: "plan-1",
      goalType: "executive_readiness",
      plannerConfidence: 0.9,
      stopReason: "completed",
      stepExecutions: [],
      response: {
        goalSummary: "Executive summary request",
        workflowsExecuted: ["project_summary", "forecast"],
        synthesizedSummary: "Project is amber with forecasted delivery risk.",
        keyFindings: ["Delivery risk is amber"],
        recommendedActions: ["Escalate blocker"],
        assumptionsMade: [],
        warnings: [],
        generatedAt: new Date()
      }
    };
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

test("TeamsBotController processes message and returns adaptive card response", async () => {
  const controller = new TeamsBotController(
    new TeamsAuthService(),
    new MockMessageRouter() as any,
    new MockAgentExecutor(),
    new AdaptiveCardRenderer(),
    new MockUsageLogService() as any
  );
  const req = mockReq({
    type: "message",
    text: "Generate weekly report",
    from: { id: "teams-user-1" },
    channelData: { tenant: { id: "teams-tenant-1" } }
  });
  const res = mockRes();

  await controller.handleMessage(req as any, res as any);
  assert.equal(res.statusCode, 200);
  assert.ok(Array.isArray(res.payload.attachments));
});

test("TeamsBotController routes broad goals to agentic goal execution when available", async () => {
  const executor = new MockAgentExecutor();
  const controller = new TeamsBotController(
    new TeamsAuthService(),
    {
      async route(): Promise<TeamsMessageRouteResult> {
        return {
          tenantId: "tenant-acme",
          projectId: "project-alpha",
          message: "Give me an executive summary with forecast and risks"
        };
      }
    } as any,
    executor,
    new AdaptiveCardRenderer(),
    new MockUsageLogService() as any
  );
  const req = mockReq({
    type: "message",
    text: "Give me an executive summary with forecast and risks",
    from: { id: "teams-user-1" },
    channelData: { tenant: { id: "teams-tenant-1" } }
  });
  const res = mockRes();

  await controller.handleMessage(req as any, res as any);
  assert.equal(res.statusCode, 200);
  assert.equal(executor.goalExecuted, true);
});
