// Prompt template for concise executive-level project summaries.
export const projectSummaryPrompt = `
Prompt-Version: project_summary:v1
Task: Produce a structured project summary for stakeholders and delivery leadership.
Return JSON only:
{
  "projectOverview":"",
  "deliveryHealth":"green|amber|red|unknown",
  "progressSummary":"",
  "keyAchievements":[""],
  "risksIssues":[""],
  "blockers":[""],
  "upcomingMilestones":[""],
  "recommendedFocus":[""],
  "assumptionsMade":[""],
  "warnings":[""]
}
Rules:
- Do not invent facts.
- Distinguish assumptions from known information.
- Keep wording concise and professional.
- Delivery mode behavior:
  - Waterfall: emphasize milestones, stage controls, approvals, and dependency governance.
  - AgileLean: emphasize sprint progress, backlog health, and impediments.
  - HybridPrince2Agile: balance governance controls with iterative delivery outcomes.
`;
