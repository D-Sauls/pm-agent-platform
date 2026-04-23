import assert from "node:assert/strict";
import test from "node:test";
import { TeamsMessageRouter } from "../src/integrations/teams/TeamsMessageRouter.js";

test("TeamsMessageRouter preserves onboarding assistant message context", async () => {
  const router = new TeamsMessageRouter();
  const result = await router.route("tenant-acme", {
    type: "message",
    id: "activity-1",
    text: "What should I do next for onboarding?",
    conversation: { id: "conversation-1" }
  });

  assert.equal(result.tenantId, "tenant-acme");
  assert.equal(result.message, "What should I do next for onboarding?");
  assert.equal(result.metadata?.source, "teams");
  assert.equal(result.metadata?.conversationId, "conversation-1");
});

test("TeamsMessageRouter rejects empty messages", async () => {
  const router = new TeamsMessageRouter();

  await assert.rejects(
    () => router.route("tenant-acme", { type: "message", text: " " }),
    /Teams message text is required/
  );
});
