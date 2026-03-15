import assert from "node:assert/strict";
import test from "node:test";
import { KnowledgeDocumentSummaryWorkflow } from "../src/core/services/workflows/knowledgeDocumentSummaryWorkflow.js";
import { KnowledgeIndexService } from "../src/core/services/knowledge/KnowledgeIndexService.js";

const sharePointConnector = {
  async getDocument() {
    return {
      id: "doc-1",
      tenantId: "tenant-acme",
      sourceSystem: "sharepoint",
      title: "Security Standard",
      tags: ["security"],
      roleTargets: [],
      documentUrl: "https://contoso/doc-1",
      contentReference: "sharepoint://doc-1",
      summary: "Security operating standard"
    };
  },
  async listDocuments() {
    return [];
  }
} as any;

const promptEngine = {
  buildPrompt() { return "prompt"; },
  async generate() {
    return JSON.stringify({
      summary: "Security standard summary",
      keyPoints: ["Use the SharePoint source"],
      assumptionsMade: [],
      warnings: []
    });
  }
} as any;

test("KnowledgeDocumentSummaryWorkflow summarizes the matched document", async () => {
  const workflow = new KnowledgeDocumentSummaryWorkflow(sharePointConnector, new KnowledgeIndexService(), promptEngine);
  const result = await workflow.execute({
    tenantContext: { tenant: { tenantId: "tenant-acme" } },
    projectContext: { project: { projectId: "knowledge", tenantId: "tenant-acme", sourceSystem: "knowledge", name: "Knowledge", deliveryMode: "hybrid" }, tasks: [], milestones: [], risks: [], issues: [], dependencies: [], statusSummary: "Knowledge" },
    userRequest: "Summarize the security standard",
    workflowId: "knowledge_document_summary",
    timestamp: new Date(),
    metadata: { documentId: "doc-1" }
  } as any);

  assert.equal(result.workflowId, "knowledge_document_summary");
  assert.equal((result.data as any).summary, "Security standard summary");
});
