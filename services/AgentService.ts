import {
  DeliveryMode,
  NormalizedProjectSnapshot,
  RaidLog,
  StatusReport
} from "../models/entities.js";

interface AgentResponseInput {
  userInput: string;
  deliveryMode: DeliveryMode;
  normalizedProject: NormalizedProjectSnapshot;
  weeklyReport: StatusReport;
  raidLog: RaidLog;
}

// Formats conversation context and applies mode-aware narrative framing.
export class AgentService {
  buildContext(input: AgentResponseInput): string {
    return JSON.stringify(
      {
        userInput: input.userInput,
        deliveryMode: input.deliveryMode,
        project: input.normalizedProject.project,
        weeklyReport: input.weeklyReport,
        raidLog: input.raidLog
      },
      null,
      2
    );
  }

  postProcessNarrative(rawModelOutput: string): string {
    // Stub: apply response guardrails and Teams-friendly formatting.
    return rawModelOutput;
  }
}
