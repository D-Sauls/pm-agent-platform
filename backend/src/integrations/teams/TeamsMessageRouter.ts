import { AppError } from "../../core/errors/AppError.js";
import type { TeamsActivity, TeamsMessageRouteResult } from "./types.js";

export class TeamsMessageRouter {
  async route(
    tenantId: string,
    activity: TeamsActivity
  ): Promise<TeamsMessageRouteResult> {
    const rawMessage = (activity.text ?? "").trim();
    if (!rawMessage) {
      throw new AppError("VALIDATION_ERROR", "Teams message text is required", 400);
    }

    return {
      tenantId,
      message: rawMessage,
      metadata: {
        source: "teams",
        conversationId: activity.conversation?.id,
        activityId: activity.id
      }
    };
  }
}
