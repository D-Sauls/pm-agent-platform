# Azure Deployment Guide

## Overview

This platform is structured for a hosted SaaS deployment with:

- `frontend/` deployed as the Teams-compatible web UI
- `backend/` deployed as the API and orchestration layer
- Microsoft Teams app assets under `teams/`
- tenant-aware admin APIs for onboarding and support operations

## Required Environment Variables

Set these for each environment (`local`, `dev`, `staging`, `production`):

- `APP_ENV`
- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `KEYVAULT_URI`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`
- `ADMIN_AUTH_MODE`
- `TEAMS_APP_ID`
- `TEAMS_BOT_APP_ID`
- `TEAMS_APP_DOMAIN`
- `BOT_ENDPOINT`
- `LICENSE_SECRET`
- `LOG_LEVEL`

Observability and guardrail settings:

- `TELEMETRY_VERBOSE`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_WORKFLOW_MAX`
- `RATE_LIMIT_AGENT_MAX`
- `RATE_LIMIT_ADMIN_MAX`

## Key Vault Configuration

1. Create an Azure Key Vault.
2. Set `KEYVAULT_URI` to the vault URI.
3. Grant the App Service managed identity `get` access to secrets.
4. Store connector and bot secrets in Key Vault using normalized secret names.

Examples:

- `clickup-api-key--tenant-acme`
- `license-secret`
- `teams-bot-app-password`

The runtime uses a chained secret provider:

1. Azure Key Vault when `KEYVAULT_URI` is present
2. Environment variables as fallback

## Azure App Service Deployment

1. Create App Service resources for backend and frontend hosting.
2. Configure application settings with the required environment variables.
3. Add GitHub repository secrets:
   - `AZURE_WEBAPP_NAME_DEV`
   - `AZURE_WEBAPP_PUBLISH_PROFILE_DEV`
   - `AZURE_WEBAPP_NAME_PROD`
   - `AZURE_WEBAPP_PUBLISH_PROFILE_PROD`
4. Push to `dev` for development deployment or `main` for production deployment.

CI/CD pipeline:

- installs dependencies
- builds backend and frontend
- runs backend tests
- generates Teams app package assets
- deploys to Azure App Service

## Teams Bot Registration

1. Register an Azure Bot / app registration.
2. Set bot messaging endpoint to `BOT_ENDPOINT`.
3. Capture the app ID in `TEAMS_APP_ID` and `TEAMS_BOT_APP_ID`.
4. Set `TEAMS_APP_DOMAIN` to the deployed frontend domain.

## Teams App Packaging

Generate the Teams package locally:

```bash
npm run package:teams
```

The generated package is written to `teams/app-package/`.

If the zip archive is not created automatically, compress these files into `pm-agent-teams-app.zip` manually:

- `manifest.json`
- `color.png`
- `outline.png`

## First Tenant Provisioning

Use the admin control plane or call the admin API:

`POST /api/admin/tenants/provision`

Example payload:

```json
{
  "tenantId": "tenant-contoso",
  "organizationName": "Contoso Ltd",
  "planType": "professional",
  "enabledConnectors": ["clickup"],
  "primaryConnector": "clickup",
  "trialMode": true
}
```

Provisioning performs:

- tenant creation
- default feature flag assignment
- default prompt assignment
- license activation or trial setup
- connector health initialization

## Runtime Safety Notes

- License enforcement runs before workflow execution.
- Plan limit checks run after license validation.
- Request correlation, rate limiting, and structured telemetry are enabled by default.
- Avoid storing secrets in `.env` files outside local development.

## Remaining Production Hardening TODOs

1. Replace in-memory tenant/admin stores with persistent data storage.
2. Move frontend deployment to Azure Static Web Apps or equivalent CDN hosting.
3. Add Entra ID production admin authentication and Bot Framework signature validation.
4. Replace simple App Service publish-profile deployment with federated Azure login.
