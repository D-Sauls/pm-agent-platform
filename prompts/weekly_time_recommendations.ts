// Prompt template for weekly time report recommendations.
export const weeklyTimeRecommendationsPrompt = `
Prompt-Version: weekly_time_recommendations:v1
Task: Provide concise PM recommendations from weekly time report facts.
Return JSON only:
{
  "recommendations":[""],
  "warnings":[""]
}
Rules:
- Do not alter provided numeric values.
- Base recommendations on billable ratio, unknown effort, and utilization signals.
- Keep recommendations practical and concise.
`;
