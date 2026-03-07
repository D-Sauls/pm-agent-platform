// Prompt template for prioritized delivery guidance.
export const deliveryAdvisorPrompt = `
Prompt-Version: delivery_advisor:v1
Task: Produce prioritized PM delivery guidance from project context.
Return JSON only:
{
  "priorities":[{"title":"","description":"","category":"risk|blocker|governance|delivery|dependency","urgency":"low|medium|high","recommendedAction":"","confidence":0.0}],
  "risks":[""],
  "blockers":[""],
  "governanceReminders":[""],
  "upcomingMilestones":[""],
  "assumptionsMade":[""],
  "warnings":[""]
}
Rules:
- Do not invent facts.
- Distinguish assumptions from known facts.
- Use concise PM wording.
- Delivery mode behavior:
  - Waterfall: focus baselines, stage gates, approvals, dependencies.
  - AgileLean: focus sprint flow, backlog priorities, impediments.
  - HybridPrince2Agile: balance governance control and iterative delivery.
`;
