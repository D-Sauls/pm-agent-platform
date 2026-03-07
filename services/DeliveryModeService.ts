import { DeliveryMode } from "../models/entities.js";

export interface DeliveryModeGuidance {
  reportingFocus: string;
  planningFocus: string;
  governanceStyle: string;
}

// Central policy map so all modules apply mode semantics consistently.
export class DeliveryModeService {
  private guidance: Record<DeliveryMode, DeliveryModeGuidance> = {
    Waterfall: {
      reportingFocus: "Milestone variance and stage-gate status",
      planningFocus: "Critical path and dependency sequencing",
      governanceStyle: "Formal phase approvals"
    },
    AgileLean: {
      reportingFocus: "Flow efficiency and sprint outcomes",
      planningFocus: "Backlog prioritization and iteration planning",
      governanceStyle: "Lightweight, continuous adaptation"
    },
    HybridPrince2Agile: {
      reportingFocus: "Governance controls with incremental delivery health",
      planningFocus: "Timeboxed increments with controlled tolerances",
      governanceStyle: "PRINCE2 governance plus agile delivery practices"
    }
  };

  getGuidance(mode: DeliveryMode): DeliveryModeGuidance {
    return this.guidance[mode];
  }
}
