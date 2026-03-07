import { RaidLog } from "./entities.js";

// RAID schema used for extraction and weekly governance reporting.
export interface RaidDocument {
  projectId: string;
  generatedAt: string;
  raid: RaidLog;
}
