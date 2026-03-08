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

## Admin Control Plane (Local Run)
1. Start backend:
   - `npm run dev -w backend`
2. Start frontend:
   - `npm run dev -w frontend`
3. Open:
   - `http://localhost:5173/admin`
4. Login (development mode only):
   - Email: `admin@local.dev`
   - Password: `ChangeMe123!`

Notes:
- Local admin login is enabled only when `NODE_ENV=development` and `ADMIN_AUTH_MODE=local`.
- In non-development environments, admin auth strategy switches to Entra mode scaffold and local login is blocked.
