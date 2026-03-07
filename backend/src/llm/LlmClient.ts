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

    return "Stub LLM response";
  }
}
