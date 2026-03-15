import { z } from "zod";
import { PromptEngine } from "../../../prompt/PromptEngine.js";
import type { KnowledgeDocumentSummaryResult } from "../../models/knowledgeModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";
import { KnowledgeIndexService } from "../knowledge/KnowledgeIndexService.js";
import { SharePointConnector } from "../m365/SharePointConnector.js";

const metadataSchema = z.object({
  role: z.string().optional(),
  documentId: z.string().optional()
});

const outputSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()).default([]),
  assumptionsMade: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});

export class KnowledgeDocumentSummaryWorkflow implements BaseWorkflow {
  id = "knowledge_document_summary" as const;
  name = "Knowledge Document Summary Workflow";
  description = "Summarizes SharePoint-backed corporate documents using indexed metadata and bounded prompting.";
  supportedInputTypes = ["document_summary", "sharepoint_summary", "policy_document_summary"];

  constructor(
    private readonly sharePointConnector: SharePointConnector,
    private readonly knowledgeIndexService: KnowledgeIndexService,
    private readonly promptEngine: PromptEngine
  ) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const metadata = metadataSchema.parse(context.metadata ?? {});
    let document = metadata.documentId
      ? await this.sharePointConnector.getDocument(context.tenantContext, metadata.documentId)
      : null;

    if (!document) {
      const matches = await this.sharePointConnector.listDocuments(context.tenantContext, {
        query: context.userRequest,
        role: metadata.role
      });
      document = matches[0] ?? null;
      if (matches.length > 0) {
        this.knowledgeIndexService.indexDocuments(matches);
      }
    }

    const promptContext = JSON.stringify(
      {
        query: context.userRequest,
        role: metadata.role,
        document,
        indexedEntry: document
          ? this.knowledgeIndexService.getEntryBySourceId(context.tenantContext.tenant.tenantId, document.id)
          : null
      },
      null,
      2
    );
    const raw = await this.promptEngine.generate(
      this.promptEngine.buildPrompt("knowledge_document_summary", "HybridPrince2Agile", promptContext)
    );

    const parsed = this.parse(raw, document?.title ?? context.userRequest);
    const result: KnowledgeDocumentSummaryResult = {
      workflowId: this.id,
      resultType: this.id,
      query: context.userRequest,
      document,
      summary: parsed.summary,
      keyPoints: parsed.keyPoints,
      assumptionsMade:
        parsed.assumptionsMade.length > 0
          ? parsed.assumptionsMade
          : ["Summary generated from SharePoint metadata rather than full downloaded file contents."],
      generatedAt: new Date(),
      warnings: [...parsed.warnings, ...(document ? [] : ["No document matched the request."])]
    };

    return {
      workflowId: this.id,
      resultType: result.resultType,
      data: result,
      generatedAt: result.generatedAt,
      confidenceScore: document ? 0.83 : 0.52,
      warnings: result.warnings
    };
  }

  private parse(raw: string, fallbackTitle: string) {
    try {
      return outputSchema.parse(JSON.parse(raw));
    } catch {
      return {
        summary: `The document ${fallbackTitle} is available through SharePoint. Open the authoritative source for the full content and approvals context.`,
        keyPoints: [
          "Use the SharePoint link as the source of record.",
          "Confirm applicability and latest version before acting."
        ],
        assumptionsMade: ["Fallback summary used because model output could not be parsed."],
        warnings: ["Model output parsing failed; fallback summary used."]
      };
    }
  }
}
