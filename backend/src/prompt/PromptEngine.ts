import { weeklyReportPrompt } from "../../../prompts/weekly_report.js";
import { raidExtractionPrompt } from "../../../prompts/raid_extraction.js";
import { changeAssessmentPrompt } from "../../../prompts/change_assessment.js";
import { planningAssistantPrompt } from "../../../prompts/planning_assistant.js";
import { DeliveryMode } from "../../../models/entities.js";
import { OpenAiLlmClient, type LlmClient } from "../llm/LlmClient.js";

export type PromptTemplateKey =
  | "weekly_report"
  | "raid_extraction"
  | "change_assessment"
  | "planning_assistant";

const promptLibrary: Record<PromptTemplateKey, string> = {
  weekly_report: weeklyReportPrompt,
  raid_extraction: raidExtractionPrompt,
  change_assessment: changeAssessmentPrompt,
  planning_assistant: planningAssistantPrompt
};

// Central point to build model-ready prompts with delivery mode context.
export class PromptEngine {
  constructor(private readonly llmClient: LlmClient = new OpenAiLlmClient()) {}

  buildPrompt(template: PromptTemplateKey, mode: DeliveryMode, context: string): string {
    return `Delivery Mode: ${mode}\nTemplate: ${template}\n${promptLibrary[template]}\nContext:\n${context}`;
  }

  async generate(prompt: string): Promise<string> {
    return this.llmClient.generateText(prompt);
  }
}
