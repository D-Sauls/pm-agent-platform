import { Router } from "express";
import { z } from "zod";
import { adminAuditService, enhancementRequestService } from "../../context/platformContext.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";

const statusSchema = z.enum(["new", "under_review", "planned", "declined", "delivered"]);

export const adminEnhancementRoutes = Router();

adminEnhancementRoutes.get(
  "/",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
    const status = req.query.status ? statusSchema.parse(String(req.query.status)) : undefined;
    res.json(enhancementRequestService.listRequests({ tenantId, status }));
  }
);

adminEnhancementRoutes.patch("/:id/status", requireAdminRole(["superadmin", "supportadmin"]), (req, res) => {
  const status = statusSchema.parse(String(req.body?.status ?? ""));
  const updated = enhancementRequestService.updateStatus(req.params.id, status);
  if (!updated) {
    return res.status(404).json({ error: "Enhancement request not found" });
  }
  adminAuditService.record(req.adminUser!, "enhancement.status", updated.tenantId, { id: updated.id, status });
  res.json(updated);
});

adminEnhancementRoutes.patch("/:id/notes", requireAdminRole(["superadmin", "supportadmin"]), (req, res) => {
  const internalNotes = String(req.body?.internalNotes ?? "");
  const updated = enhancementRequestService.addInternalNotes(req.params.id, internalNotes);
  if (!updated) {
    return res.status(404).json({ error: "Enhancement request not found" });
  }
  adminAuditService.record(req.adminUser!, "enhancement.notes", updated.tenantId, { id: updated.id });
  res.json(updated);
});
