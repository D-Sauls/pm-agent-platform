import assert from "node:assert/strict";
import test from "node:test";
import { AgentPlanner } from "../src/core/services/workflows/agentPlanner.js";

test("AgentPlanner maps onboarding next-step requests", () => {
  const planner = new AgentPlanner();
  const result = planner.plan("What should I do next for onboarding?");

  assert.equal(result.workflowId, "next_training_step");
  assert.ok(result.confidenceScore > 0.8);
});

test("AgentPlanner maps course recommendation requests", () => {
  const planner = new AgentPlanner();
  const result = planner.plan("Do I need to complete every course for my role?");

  assert.equal(result.workflowId, "course_recommendation");
});

test("AgentPlanner maps compliance gap requests", () => {
  const planner = new AgentPlanner();
  const result = planner.plan("What am I missing for compliance?");

  assert.equal(result.workflowId, "compliance_audit");
});

test("AgentPlanner maps policy explanation requests", () => {
  const planner = new AgentPlanner();
  const result = planner.plan("Explain Food Safety Policy v4");

  assert.equal(result.workflowId, "knowledge_explain");
});

test("AgentPlanner maps role-purpose requests", () => {
  const planner = new AgentPlanner();
  const result = planner.plan("What is my job role and why am I doing these courses?");

  assert.equal(result.workflowId, "role_knowledge_lookup");
});

test("AgentPlanner fallback stays in onboarding domain", () => {
  const planner = new AgentPlanner();
  const result = planner.plan("help");

  assert.equal(result.workflowId, "next_training_step");
  assert.match(result.rationale, /onboarding/i);
});

test("AgentPlanner does not route retired PM/time/billing/forecast requests", () => {
  const planner = new AgentPlanner();
  const legacyPrompts = [
    "generate weekly report",
    "prepare a project summary for leadership",
    "forecast delivery risk",
    "show weekly time report",
    "show monthly billing summary",
    "sync ClickUp tasks"
  ];

  for (const prompt of legacyPrompts) {
    const result = planner.plan(prompt);
    assert.equal(result.workflowId, "next_training_step", prompt);
    assert.match(result.rationale, /retired|onboarding/i, prompt);
  }
});
