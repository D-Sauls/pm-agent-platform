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

## Deployment Readiness
- Azure deployment guide: [docs/DEPLOYMENT_AZURE.md](./docs/DEPLOYMENT_AZURE.md)
- Teams app packaging:
  - `npm run package:teams`
  - output: `teams/app-package/`

### Deployment-Critical Env Vars
- `DATABASE_URL`
- `KEYVAULT_URI`
- `TEAMS_APP_ID`
- `TEAMS_BOT_APP_ID`
- `TEAMS_APP_DOMAIN`
- `BOT_ENDPOINT`
- `LICENSE_SECRET`
- `LOG_LEVEL`

## Operational Readiness Notes
- Structured logging:
  - JSON logs with `level`, `requestId`, `tenantId`, `workflowId`, and `connectorUsed` where available.
  - Sensitive fields (`password`, `token`, `secret`, `apiKey`, `authorization`) are redacted.
- Request correlation:
  - Every request gets `x-request-id` (propagated if provided, generated if missing).
  - Error responses include `requestId`.
- Health endpoints:
  - `GET /health/live`
  - `GET /health/ready`
  - `GET /health`
- Rate limiting:
  - Environment-configurable limits for workflow, agent, and admin paths.
  - Rate-limited responses return `429` with structured payload and `retry-after`.
- Workflow and connector observability:
  - Workflow execution telemetry captures success/failure and response time.
  - Connector telemetry captures operation status, degraded/unhealthy events, and transitions.
  - Admin logs endpoints expose workflow/connector failure views.
- Safe retries:
  - Read-only connector operations use conservative retry policy for transient failures.
  - Auth failures are not retried.

### Additional Env Vars
- `LOG_LEVEL=debug|info|warn|error`
- `TELEMETRY_VERBOSE=true|false`
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_WORKFLOW_MAX=60`
- `RATE_LIMIT_AGENT_MAX=60`
- `RATE_LIMIT_ADMIN_MAX=120`

### Production Hardening TODOs
1. Replace in-memory telemetry/rate-limit stores with distributed backing (Redis).
2. Export metrics to a monitoring backend (OpenTelemetry/Azure Monitor).
3. Add connector circuit breaker for repeated provider outages.
4. Implement Entra token validation and signed Teams webhook verification.
