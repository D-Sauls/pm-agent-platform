import { Router } from "express";
import {
  acknowledgementServiceV2,
  complianceConfigServiceV2,
  complianceReportServiceV2,
  complianceRequirementServiceV2,
  complianceTrackingServiceV2,
  hrOverrideServiceV2
} from "../../core/container.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";
import { adminAuditService } from "../../context/platformContext.js";

export const adminComplianceRoutes = Router();

adminComplianceRoutes.get(
  "/summary",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const tenantId = String(req.query.tenantId ?? "");
    const userId = String(req.query.userId ?? "tenant-scope");
    const role = String(req.query.role ?? "Employee");
    const department = typeof req.query.department === "string" ? req.query.department : undefined;
    const statuses = complianceTrackingServiceV2.calculateStatuses({
      tenantId,
      userId,
      requirements: complianceRequirementServiceV2.resolveApplicableRequirements(tenantId, role, department),
      acknowledgements: acknowledgementServiceV2.findHistory({ tenantId, userId }),
      config: complianceConfigServiceV2.getConfig(tenantId)
    });

    res.json({
      tenantSummary: complianceReportServiceV2.tenantSummary(tenantId, statuses),
      userSummary: complianceReportServiceV2.userSummary(tenantId, userId, statuses)
    });
  }
);

adminComplianceRoutes.get(
  "/requirements",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const tenantId = String(req.query.tenantId ?? "");
    res.json({ tenantId, requirements: complianceRequirementServiceV2.listRequirements(tenantId) });
  }
);

adminComplianceRoutes.get(
  "/acknowledgements",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const tenantId = String(req.query.tenantId ?? "");
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    res.json({
      tenantId,
      acknowledgements: acknowledgementServiceV2.findHistory({ tenantId, userId })
    });
  }
);

adminComplianceRoutes.get(
  "/hr-overrides",
  requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]),
  (req, res) => {
    const tenantId = String(req.query.tenantId ?? "");
    res.json({ tenantId, overrides: hrOverrideServiceV2.listOverrides(tenantId) });
  }
);

adminComplianceRoutes.post(
  "/hr-overrides",
  requireAdminRole(["superadmin", "supportadmin"]),
  (req, res, next) => {
    try {
      const tenantId = String(req.body?.tenantId ?? "");
      const created = hrOverrideServiceV2.createOverride(
        {
          id: String(req.body?.id ?? `override-${Date.now()}`),
          tenantId,
          userId: String(req.body?.userId ?? ""),
          subjectType: req.body?.subjectType,
          subjectId: String(req.body?.subjectId ?? ""),
          subjectVersionId:
            typeof req.body?.subjectVersionId === "string" ? req.body.subjectVersionId : null,
          overriddenBy: req.adminUser?.email ?? "unknown-admin",
          reason: String(req.body?.reason ?? ""),
          recordedAt: new Date()
        },
        complianceConfigServiceV2.getConfig(tenantId)
      );
      acknowledgementServiceV2.recordAcknowledgement(
        created.acknowledgement,
        complianceConfigServiceV2.getConfig(tenantId),
        false
      );
      adminAuditService.record(req.adminUser!, "compliance.hr_override.create", tenantId, {
        userId: created.override.userId,
        subjectId: created.override.subjectId
      });
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }
);
