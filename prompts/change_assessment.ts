// Prompt template for assessing impact of a change request.
export const changeAssessmentPrompt = `
Prompt-Version: change_assessment:v1
Task: Assess a requested change using PM governance language.
Output JSON only:
{
  "changeSummary":"",
  "impactAssessment":{
    "scopeClassification":"in_scope|out_of_scope|requires_review",
    "scheduleImpact":"low|medium|high|unknown",
    "effortImpact":"low|medium|high|unknown",
    "costImpact":"low|medium|high|unknown",
    "deliveryRisk":"low|medium|high|unknown",
    "dependencyImpact":[""],
    "governanceImpact":[""],
    "assumptionsMade":[""],
    "decisionRequired":"",
    "recommendedNextStep":"",
    "confidence":0.0
  },
  "warnings":[""]
}
Rules:
- Do not invent facts.
- Distinguish known facts from assumptions.
- Keep wording concise and professional.
- Delivery mode guidance:
  - Waterfall: emphasize baseline change control, formal approvals, stage gates.
  - AgileLean: emphasize backlog trade-offs, iteration planning, value impact.
  - HybridPrince2Agile: emphasize governance controls with iterative delivery flexibility.
`;
