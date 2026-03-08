// Prompt template for explaining deterministic forecast outputs.
export const forecastExplanationPrompt = `
Prompt-Version: forecast_explanation:v1
Task: Explain deterministic project forecast outputs without changing forecast numbers.
Return JSON only:
{
  "forecastExplanation":"",
  "recommendedActions":[""],
  "assumptionsMade":[""],
  "warnings":[""]
}
Rules:
- Treat deliveryForecast, capacityForecast, and billingForecast values as fixed facts.
- Do not recalculate or alter any numbers.
- Highlight key delivery risks, capacity pressure, and billable effort trends.
- Recommend concise, practical PM actions.
- Clearly separate facts from assumptions.
`;
