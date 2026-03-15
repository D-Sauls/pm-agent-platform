import { z } from "zod";
import type { SharePointDocumentLookupResult } from "../../models/knowledgeModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";
import { KnowledgeIndexService } from "../knowledge/KnowledgeIndexService.js";
import { SharePointConnector } from "../m365/SharePointConnector.js";

const metadataSchema = z.object({
  role: z.string().optional(),
  libraryId: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export class SharePointDocumentLookupWorkflow implements BaseWorkflow {
  id = "sharepoint_document_lookup" as const;
  name = "SharePoint Document Lookup Workflow";
  description = "Finds SharePoint documents the tenant can access and indexes them for knowledge workflows.";
  supportedInputTypes = ["sharepoint_lookup", "document_lookup", "knowledge_document_search"];

  constructor(
    private readonly sharePointConnector: SharePointConnector,
    private readonly knowledgeIndexService: KnowledgeIndexService
  ) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const metadata = metadataSchema.parse(context.metadata ?? {});
    const matches = await this.sharePointConnector.listDocuments(context.tenantContext, {
      query: context.userRequest,
      role: metadata.role,
      libraryId: metadata.libraryId,
      tags: metadata.tags
    });
    this.knowledgeIndexService.indexDocuments(matches);

    const result: SharePointDocumentLookupResult = {
      workflowId: this.id,
      resultType: this.id,
      query: context.userRequest,
      matches,
      generatedAt: new Date(),
      warnings: matches.length === 0 ? ["No SharePoint documents matched the request."] : []
    };

    return {
      workflowId: this.id,
      resultType: result.resultType,
      data: result,
      generatedAt: result.generatedAt,
      confidenceScore: matches.length > 0 ? 0.87 : 0.55,
      warnings: result.warnings
    };
  }
}
