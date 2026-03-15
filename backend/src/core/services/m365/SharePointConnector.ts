import { AppError } from "../../errors/AppError.js";
import type { ConnectorHealthResult } from "../../models/connectorModels.js";
import type { KnowledgeDocument } from "../../models/knowledgeModels.js";
import type { SharePointDocumentSearchFilters, SharePointLibrary } from "../../models/m365Models.js";
import type { TenantContext } from "../../models/tenantModels.js";
import { ConnectorConfigService } from "../connectors/ConnectorConfigService.js";
import { GraphAuthService } from "./GraphAuthService.js";
import { GraphClient } from "./GraphClient.js";

type GraphDrive = { id: string; name: string; webUrl?: string };
type GraphDriveItem = {
  id: string;
  name: string;
  webUrl?: string;
  lastModifiedDateTime?: string;
  parentReference?: { driveId?: string };
  listItem?: { fields?: Record<string, unknown> };
  '@microsoft.graph.downloadUrl'?: string;
  description?: string;
};

type SampleDocument = Omit<KnowledgeDocument, "tenantId"> & { tenantId?: string };

export class SharePointConnector {
  readonly sourceSystem = "sharepoint" as const;

  constructor(
    private readonly connectorConfigService: ConnectorConfigService,
    private readonly graphAuthService: GraphAuthService,
    private readonly graphClient: GraphClient = new GraphClient()
  ) {}

  async listDocumentLibraries(tenantContext: TenantContext): Promise<SharePointLibrary[]> {
    const config = await this.connectorConfigService.getConnectorConfig(tenantContext.tenant.tenantId, this.sourceSystem);
    const sampleLibraries = this.readSampleLibraries(config.metadata, tenantContext.tenant.tenantId);
    if (sampleLibraries.length > 0) {
      return sampleLibraries;
    }

    const token = await this.graphAuthService.getAppAccessToken(this.resolveAuthorityTenant(config.metadata));
    const siteId = config.siteId ?? this.metadataValue(config.metadata, "siteId");
    if (!siteId) {
      throw new AppError("CONNECTOR_CONFIG_NOT_FOUND", "SharePoint siteId is required for live Graph discovery.", 400);
    }

    const response = await this.graphClient.get<{ value: GraphDrive[] }>(`/sites/${siteId}/drives`, token);
    return response.value.map((drive) => ({
      id: drive.id,
      tenantId: tenantContext.tenant.tenantId,
      siteId,
      driveId: drive.id,
      name: drive.name,
      webUrl: drive.webUrl ?? null
    }));
  }

  async listDocuments(
    tenantContext: TenantContext,
    filters: SharePointDocumentSearchFilters = {}
  ): Promise<KnowledgeDocument[]> {
    const config = await this.connectorConfigService.getConnectorConfig(tenantContext.tenant.tenantId, this.sourceSystem);
    const sampleDocuments = this.readSampleDocuments(config.metadata, tenantContext.tenant.tenantId);
    if (sampleDocuments.length > 0) {
      return this.filterDocuments(sampleDocuments, filters);
    }

    const token = await this.graphAuthService.getAppAccessToken(this.resolveAuthorityTenant(config.metadata));
    const driveId = filters.libraryId ?? config.driveId ?? this.metadataValue(config.metadata, "driveId");
    if (!driveId) {
      throw new AppError("CONNECTOR_CONFIG_NOT_FOUND", "SharePoint driveId is required for live document discovery.", 400);
    }

    const query = filters.query?.trim();
    const encodedQuery = encodeURIComponent(query ?? "*");
    const response = await this.graphClient.get<{ value: GraphDriveItem[] }>(`/drives/${driveId}/root/search(q='${encodedQuery}')`, token);
    const mapped = response.value.map((item) => this.mapDriveItem(item, tenantContext.tenant.tenantId, config.siteId ?? null, driveId));
    return this.filterDocuments(mapped, filters);
  }

  async getDocument(tenantContext: TenantContext, documentId: string): Promise<KnowledgeDocument | null> {
    const matches = await this.listDocuments(tenantContext, {});
    return matches.find((document) => document.id === documentId) ?? null;
  }

  async healthCheck(tenantContext: TenantContext): Promise<ConnectorHealthResult> {
    try {
      const libraries = await this.listDocumentLibraries(tenantContext);
      return {
        connectorName: this.sourceSystem,
        tenantId: tenantContext.tenant.tenantId,
        status: libraries.length > 0 ? "healthy" : "degraded",
        checkedAt: new Date(),
        message: libraries.length > 0 ? "SharePoint connector reachable." : "SharePoint connected but no libraries were discovered.",
        details: { libraryCount: libraries.length }
      };
    } catch (error) {
      return {
        connectorName: this.sourceSystem,
        tenantId: tenantContext.tenant.tenantId,
        status: "unhealthy",
        checkedAt: new Date(),
        message: error instanceof Error ? error.message : "SharePoint health check failed"
      };
    }
  }

  private mapDriveItem(item: GraphDriveItem, tenantId: string, siteId: string | null, driveId: string | null): KnowledgeDocument {
    const fields = item.listItem?.fields ?? {};
    const tags = typeof fields.Tags === "string" ? fields.Tags.split(/[;,]/).map((tag) => tag.trim()).filter(Boolean) : [];
    const roles = typeof fields.AllowedRoles === "string"
      ? fields.AllowedRoles.split(/[;,]/).map((role) => role.trim()).filter(Boolean)
      : [];

    return {
      id: item.id,
      tenantId,
      sourceSystem: "sharepoint",
      title: item.name,
      tags,
      roleTargets: roles,
      documentUrl: item.webUrl ?? item['@microsoft.graph.downloadUrl'] ?? "",
      contentReference: item['@microsoft.graph.downloadUrl'] ?? item.webUrl ?? "",
      siteId,
      driveId,
      summary: (typeof item.description === "string" && item.description) || (typeof fields.Summary === "string" ? fields.Summary : null),
      webUrl: item.webUrl ?? null,
      lastModifiedAt: item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime) : null,
      metadata: fields
    };
  }

  private filterDocuments(documents: KnowledgeDocument[], filters: SharePointDocumentSearchFilters): KnowledgeDocument[] {
    const query = filters.query?.toLowerCase().trim();
    return documents.filter((document) => {
      if (filters.role && document.roleTargets.length > 0 && !document.roleTargets.includes(filters.role)) {
        return false;
      }
      if (filters.libraryId && document.libraryId !== filters.libraryId && document.driveId !== filters.libraryId) {
        return false;
      }
      if (filters.tags && filters.tags.length > 0 && !filters.tags.every((tag) => document.tags.includes(tag))) {
        return false;
      }
      if (query && !`${document.title} ${document.summary ?? ""} ${document.tags.join(" ")}`.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }

  private readSampleLibraries(metadata: Record<string, unknown> | undefined, tenantId: string): SharePointLibrary[] {
    const sample = metadata?.sampleLibraries;
    if (!Array.isArray(sample)) {
      return [];
    }
    return sample.map((entry, index) => ({
      id: String((entry as Record<string, unknown>).id ?? `sample-library-${index + 1}`),
      tenantId,
      siteId: String((entry as Record<string, unknown>).siteId ?? this.metadataValue(metadata, "siteId") ?? "sample-site"),
      driveId: String((entry as Record<string, unknown>).driveId ?? (entry as Record<string, unknown>).id ?? `sample-drive-${index + 1}`),
      name: String((entry as Record<string, unknown>).name ?? `Library ${index + 1}`),
      webUrl: String((entry as Record<string, unknown>).webUrl ?? "") || null
    }));
  }

  private readSampleDocuments(metadata: Record<string, unknown> | undefined, tenantId: string): KnowledgeDocument[] {
    const sample = metadata?.sampleDocuments;
    if (!Array.isArray(sample)) {
      return [];
    }
    return sample.map((entry, index) => {
      const document = entry as Record<string, unknown>;
      return {
        id: String(document.id ?? `sample-document-${index + 1}`),
        tenantId,
        sourceSystem: "sharepoint",
        title: String(document.title ?? `Sample document ${index + 1}`),
        tags: Array.isArray(document.tags) ? document.tags.map(String) : [],
        roleTargets: Array.isArray(document.roleTargets) ? document.roleTargets.map(String) : [],
        documentUrl: String(document.documentUrl ?? document.webUrl ?? ""),
        contentReference: String(document.contentReference ?? document.documentUrl ?? document.webUrl ?? ""),
        siteId: typeof document.siteId === "string" ? document.siteId : null,
        driveId: typeof document.driveId === "string" ? document.driveId : null,
        libraryId: typeof document.libraryId === "string" ? document.libraryId : null,
        summary: typeof document.summary === "string" ? document.summary : null,
        webUrl: typeof document.webUrl === "string" ? document.webUrl : null,
        lastModifiedAt: typeof document.lastModifiedAt === "string" ? new Date(document.lastModifiedAt) : null,
        metadata: typeof document.metadata === "object" && document.metadata ? (document.metadata as Record<string, unknown>) : {}
      } satisfies KnowledgeDocument;
    });
  }

  private metadataValue(metadata: Record<string, unknown> | undefined, key: string): string | null {
    const value = metadata?.[key];
    return typeof value === "string" ? value : null;
  }

  private resolveAuthorityTenant(metadata: Record<string, unknown> | undefined): string {
    return this.metadataValue(metadata, "directoryTenantId") ?? "common";
  }
}
