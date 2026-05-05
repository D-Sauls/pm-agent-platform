<#
.SYNOPSIS
Creates an Azure Database for PostgreSQL Flexible Server staging database for managed DB validation.

.DESCRIPTION
This script creates or reuses an Azure resource group, PostgreSQL Flexible Server, staging database,
and a narrow firewall rule for the current public IP or a provided IP address.

It intentionally does not print full connection strings with passwords. Provide the admin password
from a secret manager or prompt, then set TEST_MANAGED_DATABASE_URL locally from the final template.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$SubscriptionId = $env:AZURE_SUBSCRIPTION_ID,
  [string]$ResourceGroupName = "rg-onboarding-postgres-staging",
  [string]$Location = "eastus",
  [string]$ServerName = "onboarding-pg-staging-$((Get-Random -Minimum 10000 -Maximum 99999))",
  [string]$DatabaseName = "onboarding_staging",
  [string]$AdminUsername = "onboardingadmin",
  [Parameter(Mandatory = $true)]
  [SecureString]$AdminPassword,
  [string]$FirewallIp = "",
  [string]$FirewallRuleName = "AllowValidationClient",
  [string]$SkuName = "Standard_B1ms",
  [int]$StorageSizeGb = 32,
  [string]$PostgresVersion = "16"
)

$ErrorActionPreference = "Stop"

function Assert-AzCliAvailable {
  if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI is not installed or not on PATH. Install it from https://learn.microsoft.com/cli/azure/install-azure-cli."
  }
}

function Assert-AzLogin {
  $accountJson = az account show --only-show-errors 2>$null
  if (-not $accountJson) {
    throw "Azure CLI is not logged in. Run 'az login' first."
  }
}

function Convert-SecureStringToPlainText([SecureString]$Secret) {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Resolve-PublicIp {
  param([string]$ProvidedIp)
  if ($ProvidedIp) {
    return $ProvidedIp
  }
  try {
    return (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 15).Trim()
  } catch {
    throw "Could not detect current public IP. Re-run with -FirewallIp x.x.x.x."
  }
}

Assert-AzCliAvailable
Assert-AzLogin

if ($SubscriptionId) {
  Write-Host "Setting Azure subscription: $SubscriptionId"
  az account set --subscription $SubscriptionId --only-show-errors
}

$resolvedFirewallIp = Resolve-PublicIp -ProvidedIp $FirewallIp
$passwordPlainText = Convert-SecureStringToPlainText $AdminPassword

Write-Host "Creating/reusing resource group: $ResourceGroupName ($Location)"
az group create `
  --name $ResourceGroupName `
  --location $Location `
  --only-show-errors | Out-Null

$serverExists = $false
try {
  az postgres flexible-server show `
    --resource-group $ResourceGroupName `
    --name $ServerName `
    --only-show-errors | Out-Null
  $serverExists = $true
} catch {
  $serverExists = $false
}

if (-not $serverExists) {
  if ($PSCmdlet.ShouldProcess($ServerName, "create Azure PostgreSQL Flexible Server")) {
    Write-Host "Creating PostgreSQL Flexible Server: $ServerName"
    az postgres flexible-server create `
      --resource-group $ResourceGroupName `
      --name $ServerName `
      --location $Location `
      --admin-user $AdminUsername `
      --admin-password $passwordPlainText `
      --sku-name $SkuName `
      --storage-size $StorageSizeGb `
      --version $PostgresVersion `
      --public-access Enabled `
      --yes `
      --only-show-errors | Out-Null
  }
} else {
  Write-Host "PostgreSQL Flexible Server already exists: $ServerName"
}

Write-Host "Creating/reusing database: $DatabaseName"
az postgres flexible-server db create `
  --resource-group $ResourceGroupName `
  --server-name $ServerName `
  --database-name $DatabaseName `
  --only-show-errors | Out-Null

Write-Host "Configuring firewall rule '$FirewallRuleName' for IP: $resolvedFirewallIp"
az postgres flexible-server firewall-rule create `
  --resource-group $ResourceGroupName `
  --name $ServerName `
  --rule-name $FirewallRuleName `
  --start-ip-address $resolvedFirewallIp `
  --end-ip-address $resolvedFirewallIp `
  --only-show-errors | Out-Null

$hostName = "$ServerName.postgres.database.azure.com"
$encodedPasswordPlaceholder = "<URL_ENCODED_PASSWORD>"
$connectionTemplate = "postgresql://${AdminUsername}:$encodedPasswordPlaceholder@$hostName:5432/${DatabaseName}?sslmode=require"

Write-Host ""
Write-Host "Staging PostgreSQL setup complete."
Write-Host "Server: $hostName"
Write-Host "Database: $DatabaseName"
Write-Host "Admin user: $AdminUsername"
Write-Host "Firewall IP: $resolvedFirewallIp"
Write-Host ""
Write-Host "Set these environment variables locally. Do not commit real values:"
Write-Host "  `$env:TEST_MANAGED_DATABASE_URL='$connectionTemplate'"
Write-Host "  `$env:TEST_MANAGED_DATABASE_SSL='true'"
Write-Host ""
Write-Host "Then run:"
Write-Host "  npm.cmd test -w backend"
Write-Host "  npm.cmd run build -w backend"
