// Prompt template for monthly billing summary recommendations.
export const monthlyBillingRecommendationsPrompt = `
Prompt-Version: monthly_billing_recommendations:v1
Task: Explain monthly billing/effort trends and provide PM recommendations.
Return JSON only:
{
  "recommendations":[""],
  "warnings":[""]
}
Rules:
- Do not modify deterministic billing values.
- Highlight billable trend, non-billable overhead, unknown effort, and utilization concerns.
- Keep wording professional and concise.
`;
