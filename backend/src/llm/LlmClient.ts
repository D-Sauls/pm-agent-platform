import OpenAI from "openai";
import { env } from "../config/env.js";

export interface LlmClient {
  generateText(prompt: string): Promise<string>;
}

// OpenAI-backed LLM client with deterministic fallback for local MVP runs.
export class OpenAiLlmClient implements LlmClient {
  private client = env.openAiApiKey
    ? new OpenAI({
        apiKey: env.openAiApiKey,
        baseURL: env.openAiBaseUrl || undefined
      })
    : null;

  async generateText(prompt: string): Promise<string> {
    if (!this.client) {
      return this.fallback(prompt);
    }

    const completion = await this.client.chat.completions.create({
      model: env.openAiModel,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }]
    });

    return completion.choices[0]?.message?.content ?? this.fallback(prompt);
  }

  private fallback(prompt: string): string {
    if (prompt.includes("Template: weekly_report")) {
      return JSON.stringify({
        summary: "Project remains on-track with focused risk management required this week.",
        narrative:
          "Primary progress is visible in completed delivery tasks. Attention is needed on dependency confirmation and at-risk milestone mitigation."
      });
    }
    if (prompt.includes("Template: raid_extraction")) {
      return JSON.stringify({
        risks: [
          {
            title: "Potential schedule slip from unresolved dependencies",
            description: "Inferred from notes mentioning pending external approvals.",
            impact: "Medium",
            ownerSuggestion: "Project Manager",
            dueDateSuggestion: null,
            responseRecommendation: "Escalate dependency follow-up in next standup.",
            confidence: 0.78
          }
        ],
        issues: [
          {
            title: "Test environment access delay",
            description: "Explicitly mentioned blocker in notes.",
            impact: "High",
            ownerSuggestion: "QA Lead",
            dueDateSuggestion: null,
            responseRecommendation: "Resolve access ticket within 24 hours.",
            confidence: 0.9
          }
        ],
        assumptions: [
          {
            title: "Stakeholder sign-off this week",
            description: "Assumed by team plan unless stated otherwise.",
            impact: "Medium",
            ownerSuggestion: "Business Owner",
            dueDateSuggestion: null,
            responseRecommendation: "Confirm sign-off date in writing.",
            confidence: 0.65
          }
        ],
        dependencies: [
          {
            title: "Security team approval",
            description: "External dependency required before release.",
            impact: "High",
            ownerSuggestion: "Security Lead",
            dueDateSuggestion: null,
            responseRecommendation: "Track approval in RAID register.",
            confidence: 0.84
          }
        ],
        assumptionsMade: ["Input notes represent the latest status for the current week."],
        warnings: []
      });
    }

    return "Stub LLM response";
  }
}
