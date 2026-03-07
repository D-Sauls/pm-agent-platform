import { Router } from "express";
import {
  adminAuditService,
  promptRegistryService,
  tenantService
} from "../../context/platformContext.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";

export const adminPromptRoutes = Router();

adminPromptRoutes.get("/", requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]), (_req, res) => {
  res.json({ promptKeys: promptRegistryService.listPrompts() });
});

adminPromptRoutes.get(
  "/:promptKey/versions",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    res.json(promptRegistryService.listPromptVersions(req.params.promptKey));
  }
);

adminPromptRoutes.post("/:promptKey/default", requireAdminRole(["superadmin"]), (req, res) => {
  const version = String(req.body?.version ?? "");
  const updated = promptRegistryService.markDefault(req.params.promptKey, version);
  adminAuditService.record(req.adminUser!, "prompt.defaultVersion", undefined, {
    promptKey: req.params.promptKey,
    version
  });
  res.json(updated);
});

adminPromptRoutes.post("/:tenantId/assign", requireAdminRole(["superadmin"]), (req, res) => {
  const promptKey = String(req.body?.promptKey ?? "");
  const version = String(req.body?.version ?? "");
  const assignment = promptRegistryService.assignVersionToTenant(req.params.tenantId, promptKey, version);
  tenantService.setTenantPromptVersion(req.params.tenantId, `${promptKey}:${version}`);
  adminAuditService.record(req.adminUser!, "prompt.assignTenantVersion", req.params.tenantId, {
    promptKey,
    version
  });
  res.json(assignment);
});

adminPromptRoutes.post("/:tenantId/rollback", requireAdminRole(["superadmin"]), (req, res) => {
  const promptKey = String(req.body?.promptKey ?? "");
  const targetVersion = String(req.body?.targetVersion ?? "");
  const assignment = promptRegistryService.rollbackTenantPrompt(
    req.params.tenantId,
    promptKey,
    targetVersion
  );
  tenantService.setTenantPromptVersion(req.params.tenantId, `${promptKey}:${targetVersion}`);
  adminAuditService.record(req.adminUser!, "prompt.rollback", req.params.tenantId, {
    promptKey,
    targetVersion
  });
  res.json(assignment);
});
