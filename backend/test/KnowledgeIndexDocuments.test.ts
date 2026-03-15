import assert from "node:assert/strict";
import test from "node:test";
import { KnowledgeIndexService } from "../src/core/services/knowledge/KnowledgeIndexService.js";

test("KnowledgeIndexService indexes documents for tenant-scoped search", () => {
  const service = new KnowledgeIndexService();
  service.indexDocuments([
    {
      id: "doc-1",
      tenantId: "tenant-acme",
      sourceSystem: "sharepoint",
      title: "Leave Standard",
      tags: ["hr", "leave"],
      roleTargets: ["Finance Analyst"],
      documentUrl: "https://contoso/doc-1",
      contentReference: "sharepoint://doc-1"
    }
  ] as any);

  const results = service.search("tenant-acme", "leave", "Finance Analyst");
  assert.equal(results.length, 1);
  assert.equal(results[0].sourceType, "document");
});
