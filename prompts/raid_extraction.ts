// Prompt template for extracting and organizing RAID items.
export const raidExtractionPrompt = `
Prompt-Version: raid_extraction:v1
Task: Extract explicit and inferred Risks, Issues, Assumptions, and Dependencies from PM notes.
Rules:
- Do not invent facts beyond the note context.
- Distinguish explicit vs inferred in descriptions.
- Use concise, professional PM language.
- Return structured JSON only.
JSON schema:
{
  "risks":[{"title":"","description":"","impact":null,"ownerSuggestion":null,"dueDateSuggestion":null,"responseRecommendation":null,"confidence":0.0}],
  "issues":[...],
  "assumptions":[...],
  "dependencies":[...],
  "assumptionsMade":["..."],
  "warnings":["..."]
}
`;
