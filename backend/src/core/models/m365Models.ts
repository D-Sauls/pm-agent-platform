export interface GraphAuthSession {
  tenantId: string;
  accessToken: string;
  expiresAt: Date;
  refreshToken?: string | null;
  scope?: string | null;
  tokenType?: string | null;
}

export interface SharePointLibrary {
  id: string;
  tenantId: string;
  siteId: string;
  driveId: string;
  name: string;
  webUrl?: string | null;
}

export interface SharePointDocumentSearchFilters {
  query?: string;
  role?: string;
  tags?: string[];
  libraryId?: string;
}
