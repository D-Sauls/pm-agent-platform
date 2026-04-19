# Platform Cleanup Audit

Date: 2026-04-19

## Scope
Reviewed the platform for stale PM-agent scaffolding, duplicate runtime paths, dead route handlers, obsolete root-level models/services/connectors, inconsistent product naming, generated runtime data, and build/test risks.

Current product direction preserved:
- Multi-tenant SaaS backend
- Admin control plane
- Teams assistant
- PWA learning frontend
- Learning, policy, compliance, and evidence domains
- Role-aware onboarding engine
- HR bulk provisioning and onboarding assignment
- Agentic planner-based orchestration
- Microsoft 365 / SharePoint knowledge integration
- Observability and deployment readiness

## Findings
- The backend had two assistant execution paths:
  - Current: `POST /api/agent/goal-execute`, backed by the agentic planner/orchestrator.
  - Legacy: `POST /api/agent/respond`, backed by older PM-specific controller/orchestration code.
- The legacy route pulled in root-level `services/`, `models/`, and `connectors/` folders that no longer matched the active backend architecture.
- The frontend Teams assistant was still calling `/api/agent/respond` and using PM-agent wording.
- Repository and package metadata still used project-management-agent naming.
- Runtime/test execution can generate local persistent JSON stores under `backend/data`; these should not be committed as source data.
- Some PM-era workflow domains remain active under current routes and tests, especially forecast, RAID, weekly report, billing, and time-report workflows.

## Cleaned Up
- Removed the unused `/api/agent/respond` route.
- Switched frontend assistant calls to `/api/agent/goal-execute`.
- Removed the dead backend controller/schema/orchestration files used only by the old response route.
- Removed obsolete root-level PM-agent `services/`, `models/`, and `connectors/` source files.
- Moved remaining connector provider typing into backend-owned tenant models.
- Removed the backend TypeScript dependency on deleted root folders.
- Replaced stale Teams UI text with learning/compliance-oriented wording.
- Updated package names, frontend document title, and README to reflect the current platform.
- Added `.gitignore` entries for generated backend runtime data stores.

## Removed Or Consolidated Files
- `backend/src/controllers/agentController.ts`
- `backend/src/schemas/agentSchemas.ts`
- `backend/src/orchestration/AgentOrchestrationService.ts`
- `backend/src/orchestration/agentOrchestrator.ts`
- `backend/src/orchestration/types.ts`
- `services/AgentService.ts`
- `services/connectorRouter.ts`
- `services/DeliveryModeService.ts`
- `services/NormalizationService.ts`
- `services/projectContextService.ts`
- `services/ReportingEngine.ts`
- `services/index.ts`
- `models/entities.ts`
- `models/index.ts`
- `models/project.ts`
- `models/raid.ts`
- `models/task.ts`
- `connectors/baseConnector.ts`
- `connectors/index.ts`
- `connectors/base/Connector.ts`
- `connectors/clickup/ClickUpConnector.ts`
- `connectors/microsoft/GraphConnector.ts`
- `connectors/microsoft/PlannerConnector.ts`
- `connectors/microsoft/ProjectConnector.ts`
- `connectors/monday/MondayConnector.ts`
- `connectors/zoho/ZohoConnector.ts`

## Retained
- Active backend `src/core` models, repositories, connectors, workflows, and services.
- Admin routes and HR import routes.
- Compliance, onboarding, knowledge, SharePoint/M365, Teams, and observability surfaces.
- Existing active workflow routes even where naming is still PM-era, because they remain reachable and covered by tests.
- Prompt templates, because current prompt engine and active workflows still import them.

## Verification
- `npm.cmd run build -w backend`: passed.
- `npm.cmd run build -w frontend`: passed when run outside the sandbox so Vite/esbuild could spawn its worker.
- `npm.cmd run test -w backend`: did not complete within 5 minutes in this environment.
- Focused `node --import tsx --test --test-isolation=none test/HrImportProvisioning.test.ts`: did not complete within 2 minutes in this environment.
- Earlier sandboxed test attempts failed with `spawn EPERM`, which is an environment child-process restriction rather than a TypeScript compilation failure.

## Manual Follow-Up Items
- Product-owner review: decide whether active PM-era workflows should remain strategic extension points or be retired:
  - weekly report
  - RAID extraction
  - forecast
  - monthly billing summary
  - weekly time report
  - delivery advisor
- If retained, rename PM workflow language toward onboarding, learning operations, compliance readiness, and workforce enablement.
- Move remaining in-memory admin and tenant control-plane stores to durable persistence.
- Review prompt keys and feature flags such as `weeklyReportV2` and `raidAutoExtraction` after product workflow decisions are final.
- Investigate backend test-suite hang separately; builds pass, but test execution needs a clean local/CI run outside this constrained shell.
