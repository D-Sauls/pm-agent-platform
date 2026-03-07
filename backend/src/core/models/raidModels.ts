export type RaidItemType = "risk" | "issue" | "assumption" | "dependency";
export type RaidSourceType = "meeting_notes" | "status_notes" | "workshop_notes" | "generic";

export interface RaidItem {
  type: RaidItemType;
  title: string;
  description: string;
  impact?: string | null;
  ownerSuggestion?: string | null;
  dueDateSuggestion?: string | null;
  responseRecommendation?: string | null;
  confidence?: number | null;
}

export interface RaidExtractionInput {
  tenantId: string;
  projectId?: string;
  notesText: string;
  sourceType?: RaidSourceType;
  metadata?: Record<string, unknown>;
}

export interface RaidExtractionResult {
  workflowId: string;
  resultType: "raid_extraction";
  risks: RaidItem[];
  issues: RaidItem[];
  assumptions: RaidItem[];
  dependencies: RaidItem[];
  assumptionsMade: string[];
  warnings: string[];
  generatedAt: Date;
}
