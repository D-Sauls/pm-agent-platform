# Project Management Agent Assistant

Enterprise-ready TypeScript scaffold for a Microsoft Teams-first project management assistant.

## Architecture Overview
- `frontend/`: Teams-compatible web UI with chat and dashboard shell.
- `backend/`: Node.js API server, orchestration flow, and prompt engine.
- `connectors/`: External PM integrations (ClickUp, Zoho, Monday, Microsoft Graph).
- `models/`: Normalized project and RAID domain models.
- `services/`: Agent/business logic, reporting, and normalization layer.
- `prompts/`: Prompt templates for core assistant capabilities.

## Delivery Modes
- `Waterfall`
- `AgileLean`
- `HybridPrince2Agile`

Each mode influences report emphasis, planning guidance, and recommendation style.

## Next Steps
1. Wire real auth (OAuth + API key vault).
2. Add persistent storage for normalized snapshots.
3. Implement connector adapters against live APIs.
4. Integrate LLM provider SDK in `PromptEngine`.
