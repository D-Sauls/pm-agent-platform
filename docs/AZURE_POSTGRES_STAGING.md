# Azure PostgreSQL Staging Setup

This guide prepares an Azure Database for PostgreSQL Flexible Server instance for managed database validation of the onboarding platform.

The app uses these variables for live managed database validation:

```powershell
$env:TEST_MANAGED_DATABASE_URL="postgresql://<admin-user>:<url-encoded-password>@<server>.postgres.database.azure.com:5432/<database>?sslmode=require"
$env:TEST_MANAGED_DATABASE_SSL="true"
```

Do not commit real passwords, publish profiles, or connection strings.

## Prerequisites

- Azure CLI installed and available as `az`.
- Azure CLI authenticated with `az login`.
- Permission to create resource groups and Azure Database for PostgreSQL Flexible Server resources.
- Permission to create firewall rules on the PostgreSQL Flexible Server.
- Node.js/npm installed locally for validation commands.

## Required Azure Permissions

The operator needs rights equivalent to creating and managing:

- `Microsoft.Resources/resourceGroups`
- `Microsoft.DBforPostgreSQL/flexibleServers`
- `Microsoft.DBforPostgreSQL/flexibleServers/databases`
- `Microsoft.DBforPostgreSQL/flexibleServers/firewallRules`

A Contributor role scoped to the target resource group/subscription is sufficient for staging setup.

## Create Staging PostgreSQL

From the repository root:

```powershell
az login

$adminPassword = Read-Host "PostgreSQL admin password" -AsSecureString

.\scripts\azure\setup-postgres-staging.ps1 `
  -SubscriptionId "<subscription-id>" `
  -ResourceGroupName "rg-onboarding-postgres-staging" `
  -Location "eastus" `
  -ServerName "<globally-unique-server-name>" `
  -DatabaseName "onboarding_staging" `
  -AdminUsername "onboardingadmin" `
  -AdminPassword $adminPassword
```

Optional parameters:

```powershell
-FirewallIp "x.x.x.x"
-SkuName "Standard_B1ms"
-StorageSizeGb 32
-PostgresVersion "16"
```

If `-FirewallIp` is omitted, the script attempts to detect the current public IP with `https://api.ipify.org`.

## Set Local Validation Variables

The script prints the server/database details and a connection string template with `<URL_ENCODED_PASSWORD>`.

Set the variables manually in your shell. Do not save real values in tracked files.

```powershell
$env:TEST_MANAGED_DATABASE_URL="postgresql://onboardingadmin:<URL_ENCODED_PASSWORD>@<server>.postgres.database.azure.com:5432/onboarding_staging?sslmode=require"
$env:TEST_MANAGED_DATABASE_SSL="true"
```

If the password contains special characters, URL-encode it before putting it into the connection string.

## Run Managed DB Validation

```powershell
npm.cmd test -w backend
npm.cmd run build -w backend
npm.cmd test -w frontend
npm.cmd run build -w frontend
```

The optional PostgreSQL integration test is skipped unless `TEST_MANAGED_DATABASE_URL` is set.

## Cleanup

To delete the whole staging resource group:

```powershell
.\scripts\azure\remove-postgres-staging.ps1 `
  -SubscriptionId "<subscription-id>" `
  -ResourceGroupName "rg-onboarding-postgres-staging"
```

This deletes the PostgreSQL server, database, firewall rules, and all other resources in that resource group.

## Safety Notes

- Do not commit real `TEST_MANAGED_DATABASE_URL` values.
- Rotate generated or shared passwords after validation.
- Restrict firewall access to known operator/build-agent IPs only.
- Use `TEST_MANAGED_DATABASE_SSL=true` for staging and production-like validation.
- Prefer a dedicated staging database; do not run validation against production data.
- Delete the staging resource group when validation is complete if it is no longer needed.
