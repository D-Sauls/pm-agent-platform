import assert from "node:assert/strict";
import test from "node:test";
import { GraphAuthService } from "../src/core/services/m365/GraphAuthService.js";

test("GraphAuthService builds admin consent URL", () => {
  process.env.GRAPH_CLIENT_ID = "client-id";
  process.env.GRAPH_REDIRECT_URI = "http://localhost/callback";
  const service = new GraphAuthService(async () => new Response("{}"));
  const url = service.buildAdminConsentUrl("state-1", "contoso.onmicrosoft.com");
  assert.match(url, /adminconsent/);
  assert.match(url, /state-1/);
});
