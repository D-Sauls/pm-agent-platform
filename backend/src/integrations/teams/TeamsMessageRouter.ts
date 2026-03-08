import { AppError } from "../../core/errors/AppError.js";
import type { ProjectRepository } from "../../core/repositories/interfaces.js";
import type { TeamsActivity, TeamsMessageRouteResult } from "./types.js";

export class TeamsMessageRouter {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async route(
    tenantId: string,
    activity: TeamsActivity
  ): Promise<TeamsMessageRouteResult> {
    const rawMessage = (activity.text ?? "").trim();
    if (!rawMessage) {
      throw new AppError("VALIDATION_ERROR", "Teams message text is required", 400);
    }

    const explicitProjectId = this.extractProjectId(rawMessage);
    const projectId = explicitProjectId ?? (await this.resolveDefaultProjectId(tenantId));

    return {
      tenantId,
      projectId,
      message: this.stripProjectToken(rawMessage),
      metadata: {
        source: "teams",
        conversationId: activity.conversation?.id,
        activityId: activity.id
      }
    };
  }

  private extractProjectId(message: string): string | undefined {
    const match = message.match(/project(?:\s*[:=]|\s+)([a-zA-Z0-9._-]+)/i);
    return match?.[1];
  }

  private stripProjectToken(message: string): string {
    return message.replace(/project(?:\s*[:=]|\s+)[a-zA-Z0-9._-]+/i, "").trim() || message;
  }

  private async resolveDefaultProjectId(tenantId: string): Promise<string> {
    const projects = await this.projectRepository.listByTenant(tenantId);
    if (projects.length === 0) {
      throw new AppError("PROJECT_NOT_FOUND", `No project found for tenant ${tenantId}`, 404);
    }
    return projects[0].projectId;
  }
}
