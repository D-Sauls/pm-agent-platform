<#
.SYNOPSIS
Deletes the Azure resource group used for PostgreSQL staging validation.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$SubscriptionId = $env:AZURE_SUBSCRIPTION_ID,
  [string]$ResourceGroupName = "rg-onboarding-postgres-staging"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw "Azure CLI is not installed or not on PATH."
}

$accountJson = az account show --only-show-errors 2>$null
if (-not $accountJson) {
  throw "Azure CLI is not logged in. Run 'az login' first."
}

if ($SubscriptionId) {
  Write-Host "Setting Azure subscription: $SubscriptionId"
  az account set --subscription $SubscriptionId --only-show-errors
}

if ($PSCmdlet.ShouldProcess($ResourceGroupName, "delete Azure resource group and all contained staging resources")) {
  az group delete --name $ResourceGroupName --yes --no-wait --only-show-errors
  Write-Host "Delete requested for resource group: $ResourceGroupName"
}
