import assert from "node:assert/strict";
import test from "node:test";
import { ConnectorHealthService } from "../src/services/ConnectorHealthService.js";
import { FeatureFlagService } from "../src/services/FeatureFlagService.js";
import { LicenseService } from "../src/services/LicenseService.js";
import { PromptRegistryService } from "../src/services/PromptRegistryService.js";
import { TenantService } from "../src/services/TenantService.js";
import { TenantProvisioningService } from "../src/services/TenantProvisioningService.js";

test("TenantProvisioningService provisions tenant, license, prompts, and connectors", () => {
  const tenantService = new TenantService();
  const licenseService = new LicenseService();
  const featureFlagService = new FeatureFlagService();
  const connectorHealthService = new ConnectorHealthService();
  const promptRegistryService = new PromptRegistryService();
  const provisioningService = new TenantProvisioningService(
    tenantService,
    licenseService,
    featureFlagService,
    connectorHealthService,
    promptRegistryService
  );

  const result = provisioningService.provisionTenant({
    tenantId: "tenant-contoso",
    organizationName: "Contoso Ltd",
    planType: "professional",
    enabledConnectors: ["clickup", "monday"],
    primaryConnector: "clickup",
    trialMode: true
  });

  assert.equal(result.tenant.tenantId, "tenant-contoso");
  assert.equal(result.license.status, "trial");
  assert.ok(result.license.licenseKey);
  assert.equal(result.featureFlags.tenantId, "tenant-contoso");
  assert.equal(result.promptAssignments[0]?.promptKey, "weekly_report");
  assert.deepEqual(
    result.connectorHealth.map((entry) => entry.connectorName).sort(),
    ["clickup", "monday"]
  );
});

test("TenantProvisioningService rejects duplicate tenant IDs", () => {
  const provisioningService = new TenantProvisioningService(
    new TenantService(),
    new LicenseService(),
    new FeatureFlagService(),
    new ConnectorHealthService(),
    new PromptRegistryService()
  );

  assert.throws(() => {
    provisioningService.provisionTenant({
      tenantId: "tenant-acme",
      organizationName: "Acme Duplicate",
      planType: "enterprise"
    });
  });
});
