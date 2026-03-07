import assert from "node:assert/strict";
import test from "node:test";
import { AgentPlanner } from "../src/core/services/workflows/agentPlanner.js";

test("AgentPlanner maps weekly report request", () => {
  const planner = new AgentPlanner();
  const result = planner.plan("generate weekly report");
  assert.equal(result.workflowId, "weekly_report");
  assert.ok(result.confidenceScore > 0.9);
});

test("AgentPlanner maps RAID request", () => {
  const planner = new AgentPlanner();
  const result = planner.plan("turn these notes into risks and issues");
  assert.equal(result.workflowId, "raid_extraction");
});

test("AgentPlanner maps meeting risk phrase to RAID extraction", () => {
  const planner = new AgentPlanner();
  const result = planner.plan("identify risks from this meeting");
  assert.equal(result.workflowId, "raid_extraction");
});

test("AgentPlanner maps change-control phrase to ChangeAssessmentWorkflow", () => {
  const planner = new AgentPlanner();
  const result = planner.plan("does this require change control");
  assert.equal(result.workflowId, "change_assessment");
});

test("AgentPlanner maps delivery advice phrase to DeliveryAdvisorWorkflow", () => {
  const planner = new AgentPlanner();
  const result = planner.plan("what should I focus on next");
  assert.equal(result.workflowId, "delivery_advisor");
});

test("AgentPlanner fallback maps to project summary", () => {
  const planner = new AgentPlanner();
  const result = planner.plan("help");
  assert.equal(result.workflowId, "project_summary");
});
