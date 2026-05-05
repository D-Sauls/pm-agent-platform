# Cloud Development Workspace

This repo can run directly in a cloud workspace with GitHub Codespaces or VS Code Dev Containers.

Use this when you do not want to depend on your local OneDrive folder, local Node install, or local database files.

## What This Provides

- Node.js 24 development container.
- PostgreSQL 16 sidecar database for cloud development.
- Azure CLI and GitHub CLI installed in the workspace.
- Forwarded ports:
  - `5173`: frontend PWA/admin portal
  - `4000`: backend API
  - `5432`: cloud dev PostgreSQL
- App runtime configured to use PostgreSQL inside the cloud workspace:
  - `PERSISTENCE_DRIVER=postgres`
  - `DATABASE_URL=postgresql://onboarding:onboarding_dev_password@postgres:5432/onboarding_dev`
  - `DATABASE_SSL=false` for the local container network only

## Start From GitHub Codespaces

1. Push the `.devcontainer` files to GitHub.
2. Open the repository on GitHub.
3. Select `Code` -> `Codespaces` -> `Create codespace on dev`.
4. Wait for `postCreateCommand` to finish.

Then start both apps in separate terminals:

```bash
npm run dev -w backend
npm run dev -w frontend
```

Open the forwarded frontend URL for port `5173`.

## Start From VS Code Dev Containers

1. Install Docker Desktop.
2. Install the VS Code Dev Containers extension.
3. Open this repository in VS Code.
4. Run `Dev Containers: Reopen in Container`.
5. Start the backend and frontend:

```bash
npm run dev -w backend
npm run dev -w frontend
```

## Cloud Development Versus Staging

This cloud workspace is for development. It is not the same as staging or production.

- Cloud dev database: PostgreSQL container inside Codespaces/devcontainer.
- Staging database: Azure Database for PostgreSQL Flexible Server using `TEST_MANAGED_DATABASE_URL`.
- Production database: managed PostgreSQL configured through deployment secrets.

For real staging validation, use:

```powershell
$env:TEST_MANAGED_DATABASE_URL="postgresql://<user>:<password>@<server>.postgres.database.azure.com:5432/<database>?sslmode=require"
$env:TEST_MANAGED_DATABASE_SSL="true"
npm.cmd test -w backend
```

## Safety Notes

- The devcontainer database password is a local container-only development password.
- Do not reuse the devcontainer database password in Azure or production.
- Do not commit real connection strings, SendGrid keys, Azure publish profiles, or passwords.
- Codespaces secrets should be configured in GitHub if cloud development needs real provider access.
- Keep production/staging secrets in GitHub Actions or Azure App Service configuration, not in repo files.

## Recommended Workflow

1. Develop in Codespaces or Dev Container.
2. Run tests/builds inside the cloud workspace.
3. Commit and push to `dev`.
4. GitHub Actions builds and deploys only if CI secrets are configured.
5. Staging PostgreSQL validation still requires `TEST_MANAGED_DATABASE_URL` pointing at Azure PostgreSQL.
