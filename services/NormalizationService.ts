import {
  ClickUpConnector,
  MondayConnector,
  MicrosoftProjectConnector,
  PlannerConnector,
  ZohoConnector
} from "../connectors/index.js";
import { NormalizedProjectSnapshot } from "../models/entities.js";

// Pulls source data from all configured systems and maps into canonical schema.
export class NormalizationService {
  private connectors = [
    new ClickUpConnector(),
    new ZohoConnector(),
    new MondayConnector(),
    new PlannerConnector(),
    new MicrosoftProjectConnector()
  ];

  async collectAndNormalizeProject(projectId: string): Promise<NormalizedProjectSnapshot> {
    // Stub: orchestrate connector fetches and merge strategy.
    return {
      sourceSystem: "composite",
      project: { id: projectId, name: "Stub Project", owner: "PM", status: "Green" },
      tasks: [],
      milestones: [],
      risks: [],
      issues: [],
      dependencies: [],
      sprints: []
    };
  }
}
