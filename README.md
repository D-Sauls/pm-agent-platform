# AI Onboarding, Learning, Knowledge, and Compliance Platform

Enterprise-ready TypeScript platform for multi-tenant employee onboarding, learning delivery, compliance evidence, HR provisioning, Microsoft Teams assistance, and PWA access.

## Architecture Overview
- `frontend/`: PWA learning frontend, admin portal surfaces, and Teams-compatible assistant shell.
- `backend/`: Node.js API server, tenant-aware admin routes, onboarding engine, HR import services, compliance/evidence APIs, observability middleware, and agentic orchestration.
- `prompts/`: Prompt templates used by the assistant and workflow orchestration layer.
- `teams/`: Teams app manifest, packaging script, and Teams deployment assets.
- `docs/`: Deployment and platform audit documentation.
- `data/`: Local persistent development data stores.

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

## Employee PWA (Local Run)
1. Start backend:
   - `npm run dev -w backend`
2. Start frontend:
   - `npm run dev -w frontend`
3. Open:
   - `http://localhost:5173/`
4. Use the employee login screen with a tenant and user context such as:
   - Tenant: `tenant-acme`
   - User: `user-fin-1`
   - Role: `Finance Analyst`
   - Department: `Finance`
5. Teams-specific surface remains available at:
   - `http://localhost:5173/teams`

## PWA Notes
- The PWA manifest is served from `frontend/public/manifest.webmanifest`.
- Service worker is registered from `frontend/src/main.tsx` and implemented in `frontend/public/sw.js`.
- Offline downloads are tracked locally in browser storage and rely on service worker caching for supported content URLs.
- Progress updates queue locally while offline and are replayed when the browser reconnects.
- Tenant branding is resolved from tenant context plus safe branding presets/fallbacks in the frontend.

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
  - Every request gets `x-request-id` propagated if provided, generated if missing.
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
1. Replace in-memory telemetry/rate-limit stores with distributed backing such as Redis.
2. Export metrics to a monitoring backend such as OpenTelemetry or Azure Monitor.
3. Add connector circuit breaker behavior for repeated provider outages.
4. Implement Entra token validation and signed Teams webhook verification.
