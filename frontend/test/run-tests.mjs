import assert from "node:assert/strict";
import { resolveAppSurface } from "../dist/surface.js";
import { getAssistantDemoResult, normalizeAssistantMessage } from "../dist/assistantDemoData.js";
import { resolveTenantBranding } from "../dist/pwa/branding.js";
import { buildApiUrl, withBasePath } from "../dist/pwa/runtime.js";
import {
  clearEmployeeSession,
  loadEmployeeSession,
  saveEmployeeSession,
  toEmployeeSessionAccess
} from "../dist/session/employeeSession.js";

assert.equal(resolveAppSurface("/admin"), "admin");
assert.equal(resolveAppSurface("/teams"), "teams");
assert.equal(resolveAppSurface("/"), "pwa");
assert.equal(resolveAppSurface("/onboarding_training"), "pwa");

assert.equal(resolveTenantBranding("tenant-acme").appName, "Acme Learning Hub");
assert.equal(resolveTenantBranding("unknown", "Contoso").logoText, "CO");

assert.equal(withBasePath("/onboarding_training", "/sw.js"), "/onboarding_training/sw.js");
assert.equal(buildApiUrl("/onboarding_training", "/learning/progress"), "/onboarding_training/api/learning/progress");
assert.equal(buildApiUrl("", "/learning/progress"), "/api/learning/progress");

const mockStorage = {
  data: new Map(),
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  },
  setItem(key, value) {
    this.data.set(key, value);
  },
  removeItem(key) {
    this.data.delete(key);
  }
};

saveEmployeeSession(
  {
    userId: "user-1",
    tenantId: "tenant-acme",
    username: "A100",
    displayName: "Alex User",
    role: "Finance Analyst",
    department: "Finance",
    sessionToken: "token-123"
  },
  mockStorage
);
assert.equal(loadEmployeeSession(mockStorage)?.tenantId, "tenant-acme");
assert.equal(toEmployeeSessionAccess(loadEmployeeSession(mockStorage)).sessionToken, "token-123");
clearEmployeeSession(mockStorage);
assert.equal(loadEmployeeSession(mockStorage), null);

const rolePurposeReply = getAssistantDemoResult("What is my job role or the real purpose for me doing these coureses");
assert.equal(rolePurposeReply.goalType, "role_context_demo");
assert.match(rolePurposeReply.response.synthesizedSummary, /purpose/i);

const courseScopeReply = getAssistantDemoResult("Do you think I should do all these courses");
assert.equal(courseScopeReply.goalType, "assignment_scope_demo");
assert.match(courseScopeReply.response.synthesizedSummary, /not treat every course/i);

assert.equal(normalizeAssistantMessage("courese coureses compliace traning complere"), "course courses compliance training complete");

const assistantPromptCases = [
  ["What do you think about these courese", "assignment_scope_demo"],
  ["Do I need to complete every course?", "assignment_scope_demo"],
  ["Are all courses required for me?", "assignment_scope_demo"],
  ["So which course is quicker to complere", "course_duration_demo"],
  ["Which course is the fastest to complete?", "course_duration_demo"],
  ["What is the shortest lesson?", "course_duration_demo"],
  ["What should I do next?", "next_training_step_demo"],
  ["Why am I doing these courses?", "role_context_demo"],
  ["Explain Food Safety Policy v4", "knowledge_lookup_demo"],
  ["What am I missing for compliace?", "compliance_audit_demo"],
  ["Summarize my onboarding path", "onboarding_recommendation_demo"],
  ["hello?", "assistant_guidance_demo"]
];

for (const [prompt, expectedGoalType] of assistantPromptCases) {
  assert.equal(getAssistantDemoResult(prompt).goalType, expectedGoalType, prompt);
}

const overlappingAssistantPromptCases = [
  ["What policy am I missing for compliance?", "compliance_audit_demo"],
  ["Explain what I am missing for compliance", "compliance_audit_demo"],
  ["Which policy is overdue?", "compliance_audit_demo"],
  ["What should I do next for compliance?", "next_training_step_demo"],
  ["What is next in my onboarding path?", "next_training_step_demo"],
  ["Why am I doing the fastest course?", "role_context_demo"],
  ["Do I need every policy and course?", "assignment_scope_demo"],
  ["Do I need to complete every course before acknowledging policy?", "assignment_scope_demo"],
  ["Explain why the fastest course matters", "course_duration_demo"],
  ["Explain compliance policy", "compliance_audit_demo"]
];

for (const [prompt, expectedGoalType] of overlappingAssistantPromptCases) {
  assert.equal(getAssistantDemoResult(prompt).goalType, expectedGoalType, `overlap: ${prompt}`);
}

console.log("frontend smoke tests passed");
