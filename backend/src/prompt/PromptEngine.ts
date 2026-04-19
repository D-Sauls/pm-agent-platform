import { weeklyReportPrompt } from "../../../prompts/weekly_report.js";
import { raidExtractionPrompt } from "../../../prompts/raid_extraction.js";
import { changeAssessmentPrompt } from "../../../prompts/change_assessment.js";
import { deliveryAdvisorPrompt } from "../../../prompts/delivery_advisor.js";
import { forecastExplanationPrompt } from "../../../prompts/forecast_explanation.js";
import { monthlyBillingRecommendationsPrompt } from "../../../prompts/monthly_billing_recommendations.js";
import { knowledgeDocumentSummaryPrompt } from "../../../prompts/knowledge_document_summary.js";
import { knowledgeExplainPrompt } from "../../../prompts/knowledge_explain.js";
import { projectSummaryPrompt } from "../../../prompts/project_summary.js";
import { planningAssistantPrompt } from "../../../prompts/planning_assistant.js";
import { weeklyTimeRecommendationsPrompt } from "../../../prompts/weekly_time_recommendations.js";
import { OpenAiLlmClient, type LlmClient } from "../llm/LlmClient.js";

export type PromptDeliveryMode = "Waterfall" | "AgileLean" | "HybridPrince2Agile";

export type PromptTemplateKey =
  | "weekly_report"
  | "raid_extraction"
  | "change_assessment"
  | "delivery_advisor"
  | "forecast_explanation"
  | "weekly_time_recommendations"
  | "monthly_billing_recommendations"
  | "knowledge_explain"
  | "knowledge_document_summary"
  | "project_summary"
  | "planning_assistant";

const promptLibrary: Record<PromptTemplateKey, string> = {
  weekly_report: weeklyReportPrompt,
  raid_extraction: raidExtractionPrompt,
  change_assessment: changeAssessmentPrompt,
  delivery_advisor: deliveryAdvisorPrompt,
  forecast_explanation: forecastExplanationPrompt,
  weekly_time_recommendations: weeklyTimeRecommendationsPrompt,
  monthly_billing_recommendations: monthlyBillingRecommendationsPrompt,
  knowledge_explain: knowledgeExplainPrompt,
  knowledge_document_summary: knowledgeDocumentSummaryPrompt,
  project_summary: projectSummaryPrompt,
  planning_assistant: planningAssistantPrompt
};

export class PromptEngine {
  constructor(private readonly llmClient: LlmClient = new OpenAiLlmClient()) {}

  buildPrompt(template: PromptTemplateKey, mode: PromptDeliveryMode, context: string): string {
    return `Delivery Mode: ${mode}\nTemplate: ${template}\n${promptLibrary[template]}\nContext:\n${context}`;
  }

  async generate(prompt: string): Promise<string> {
    return this.llmClient.generateText(prompt);
  }
}
