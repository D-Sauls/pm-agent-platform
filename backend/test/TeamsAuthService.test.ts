import assert from "node:assert/strict";
import test from "node:test";
import { TeamsAuthService } from "../src/integrations/teams/TeamsAuthService.js";

test("TeamsAuthService maps Teams tenantId to platform tenantId", () => {
  const service = new TeamsAuthService('{"teams-tenant-1":"tenant-acme"}');
  const result = service.resolve({
    type: "message",
    from: { id: "user-1", name: "Alice" },
    channelData: { tenant: { id: "teams-tenant-1" } }
  });

  assert.equal(result.platformTenantId, "tenant-acme");
  assert.equal(result.teamsUserId, "user-1");
});
