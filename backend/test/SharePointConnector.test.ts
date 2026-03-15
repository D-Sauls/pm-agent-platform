import assert from "node:assert/strict";
import test from "node:test";
import { SharePointConnector } from "../src/core/services/m365/SharePointConnector.js";

const connectorConfigService = {
  async getConnectorConfig() {
    return {
      tenantId: "tenant-acme",
      connectorName: "sharepoint",
      authType: "oauth",
      isEnabled: true,
      metadata: {
        sampleDocuments: [
          {
            id: "doc-1",
            title: "Security Standard",
            tags: ["security"],
            roleTargets: ["Finance Analyst"],
            documentUrl: "https://contoso/doc-1",
            contentReference: "sharepoint://doc-1",
            summary: "Security operating standard"
          }
        ]
      }
    };
  }
} as any;

const graphAuthService = { async getAppAccessToken() { return "token"; } } as any;

test("SharePointConnector returns sample documents and filters by role", async () => {
  const connector = new SharePointConnector(connectorConfigService, graphAuthService);
  const documents = await connector.listDocuments({ tenant: { tenantId: "tenant-acme" } } as any, {
    query: "security",
    role: "Finance Analyst"
  });
  assert.equal(documents.length, 1);
  assert.equal(documents[0].title, "Security Standard");
});
