import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { Router } from "express";
import { z } from "zod";
import {
  acknowledgementServiceV2,
  complianceConfigServiceV2,
  complianceRequirementServiceV2,
  courseServiceV2,
  courseVersionServiceV2,
  hrOverrideServiceV2,
  learningProgressServiceV2,
  policyServiceV2,
  policyVersionServiceV2,
  tenantServiceV2,
  userImportServiceV2
} from "../../core/container.js";
import type {
  AcknowledgementRecord,
  ComplianceStatus,
  CourseVersion,
  PolicyVersion
} from "../../core/models/complianceModels.js";
import type { Course, Policy } from "../../core/models/knowledgeModels.js";
import type { ProvisionedUser, RoleAssignmentOutcome } from "../../core/models/hrImportModels.js";
import { requireAdminRole } from "../../middleware/AdminRoleMiddleware.js";
import { adminAuditService } from "../../context/platformContext.js";

export const adminExperienceRoutes = Router();

const tenantQuerySchema = z.object({ tenantId: z.string().min(1).optional() });
const overrideSchema = z.object({
  tenantId: z.string().min(1).optional(),
  subjectType: z.enum(["policy", "course", "lesson"]),
  subjectId: z.string().min(1),
  subjectVersionId: z.string().min(1).nullable().optional(),
  reason: z.string().min(3)
});
const publishPolicySchema = z.object({
  tenantId: z.string().min(1).optional(),
  versionLabel: z.string().min(1),
  documentReference: z.string().min(1).optional(),
  effectiveDate: z.string().min(1).optional(),
  changeSummary: z.string().optional()
});
const publishCourseSchema = z.object({
  tenantId: z.string().min(1).optional(),
  versionLabel: z.string().min(1),
  changeSummary: z.string().optional()
});
const settingsPatchSchema = z.object({
  tenantId: z.string().min(1).optional(),
  organizationName: z.string().min(1).optional(),
  appName: z.string().min(1).optional(),
  brandColor: z.string().min(1).optional(),
  downloadPolicy: z.enum(["allow_anywhere", "authenticated_only", "vpn_only", "office_ip_only"]).optional(),
  complianceDueDays: z.number().int().positive().optional(),
  allowedIpRanges: z.array(z.string()).optional()
});

type AdminComplianceStatus = "compliant" | "pending" | "overdue" | "non_compliant";

function iso(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function resolveTenantId(req: Request): Promise<string> {
  const query = tenantQuerySchema.parse(req.query);
  const bodyTenantId = typeof req.body?.tenantId === "string" ? req.body.tenantId : undefined;
  const requestedTenantId = query.tenantId ?? bodyTenantId;
  if (requestedTenantId) {
    await tenantServiceV2.getTenantById(requestedTenantId);
    return requestedTenantId;
  }

  const tenants = await tenantServiceV2.listTenants();
  const defaultTenant = tenants.find((tenant) => tenant.status === "active") ?? tenants[0];
  if (!defaultTenant) {
    throw new Error("No tenant is available for admin experience data.");
  }
  return defaultTenant.tenantId;
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function fullName(user: ProvisionedUser): string {
  return `${user.firstName} ${user.lastName}`.trim() || user.username;
}

function latestAssignment(assignments: RoleAssignmentOutcome[]): RoleAssignmentOutcome | null {
  return assignments[assignments.length - 1] ?? null;
}

function effectiveStatus(status: ComplianceStatus, now = new Date()): ComplianceStatus {
  if (status.status === "completed" || status.status === "exempted") return status;
  if (status.dueDate && new Date(status.dueDate).getTime() < now.getTime()) {
    return { ...status, status: "overdue" };
  }
  return status;
}

function summarizeUserStatus(statuses: ComplianceStatus[]): AdminComplianceStatus {
  const effective = statuses.map((status) => effectiveStatus(status));
  const overdue = effective.filter((status) => status.status === "overdue").length;
  if (overdue > 1) return "non_compliant";
  if (overdue > 0) return "overdue";
  if (effective.some((status) => status.status !== "completed" && status.status !== "exempted")) return "pending";
  return "compliant";
}

function currentPolicyVersion(policyId: string): PolicyVersion | null {
  return policyVersionServiceV2.getCurrentVersion(policyId);
}

function currentCourseVersion(courseId: string): CourseVersion | null {
  return courseVersionServiceV2.getCurrentVersion(courseId);
}

function safeCourse(tenantId: string, courseId: string): Course | null {
  try {
    return courseServiceV2.getCourseById(tenantId, courseId);
  } catch {
    return null;
  }
}

function safePolicy(tenantId: string, policyId: string): Policy | null {
  try {
    return policyServiceV2.getPolicyById(tenantId, policyId);
  } catch {
    return null;
  }
}

function applicableRequirementIds(user: ProvisionedUser) {
  return user.roleName
    ? complianceRequirementServiceV2.resolveApplicableRequirements(
        user.tenantId,
        user.roleName,
        user.department ?? undefined
      )
    : [];
}

function getUserAssignments(user: ProvisionedUser) {
  const assignment = latestAssignment(userImportServiceV2.listAssignments(user.tenantId, user.id));
  const requirements = applicableRequirementIds(user);
  const assignedCourseIds = unique([
    ...(assignment?.assignedCourseIds ?? []),
    ...requirements.filter((requirement) => requirement.requirementType === "course").map((requirement) => requirement.requirementId)
  ]);
  const assignedPolicyIds = unique([
    ...(assignment?.assignedPolicyIds ?? []),
    ...requirements.filter((requirement) => requirement.requirementType === "policy").map((requirement) => requirement.requirementId)
  ]);

  return { assignment, requirements, assignedCourseIds, assignedPolicyIds };
}

function buildStatuses(user: ProvisionedUser): ComplianceStatus[] {
  const persisted = userImportServiceV2.listComplianceStatuses(user.tenantId, user.id).map((status) => effectiveStatus(status));
  if (persisted.length > 0) return persisted;
  const requirements = applicableRequirementIds(user);
  return requirements.map((requirement) =>
    effectiveStatus({
      tenantId: user.tenantId,
      userId: user.id,
      requirementId: requirement.id,
      status: "assigned",
      assignedAt: null,
      dueDate: requirement.dueInDays != null ? new Date(Date.now() + requirement.dueInDays * 86400_000) : null,
      completedAt: null,
      lastAcknowledgementId: null
    })
  );
}

function buildEmployeeSummary(user: ProvisionedUser) {
  const statuses = buildStatuses(user);
  const overdueItems = statuses.filter((status) => status.status === "overdue").length;
  const { assignedCourseIds } = getUserAssignments(user);
  const courseProgress = assignedCourseIds
    .map((courseId) => safeCourse(user.tenantId, courseId))
    .filter((course): course is Course => Boolean(course))
    .map((course) => learningProgressServiceV2.calculateCourseProgress(user.tenantId, user.id, course));
  const progress = courseProgress.length === 0
    ? statuses.length > 0 && statuses.every((status) => status.status === "completed") ? 100 : 0
    : Math.round(courseProgress.reduce((total, item) => total + item.progressPercent, 0) / courseProgress.length);
  const latestAcknowledgement = acknowledgementServiceV2
    .findHistory({ tenantId: user.tenantId, userId: user.id })
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
  const latestActivationDelivery = userImportServiceV2
    .listActivationDeliveryAttempts(user.tenantId, user.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  return {
    id: user.id,
    employeeCode: user.employeeCode,
    name: fullName(user),
    department: user.department ?? "Unassigned",
    role: user.roleName ?? "Unassigned",
    complianceStatus: summarizeUserStatus(statuses),
    overdueItems,
    onboardingProgress: progress,
    lastActivity: iso(latestAcknowledgement?.recordedAt) ?? iso(user.updatedAt),
    nextAction: resolveNextAction(user, statuses),
    accountStatus: user.accountStatus,
    activationDeliveryStatus: latestActivationDelivery?.status ?? null,
    activationDeliveryChannel: latestActivationDelivery?.channel ?? null,
    activationDeliveryMessage: latestActivationDelivery?.message ?? null,
    activationDeliveryAt: iso(latestActivationDelivery?.sentAt ?? latestActivationDelivery?.failedAt ?? latestActivationDelivery?.createdAt)
  };
}

function resolveNextAction(user: ProvisionedUser, statuses: ComplianceStatus[]): string {
  const overdueStatus = statuses.find((status) => status.status === "overdue");
  const pendingStatus = statuses.find((status) => status.status !== "completed" && status.status !== "exempted");
  const target = overdueStatus ?? pendingStatus;
  if (!target) return "No required action";
  const requirement = complianceRequirementServiceV2.listRequirements(user.tenantId).find((item) => item.id === target.requirementId);
  if (!requirement) return "Review assigned compliance item";
  const policy = requirement.requirementType === "policy" ? safePolicy(user.tenantId, requirement.requirementId) : null;
  const course = requirement.requirementType === "course" ? safeCourse(user.tenantId, requirement.requirementId) : null;
  return `${target.status === "overdue" ? "Overdue" : "Pending"}: ${policy?.title ?? course?.title ?? requirement.requirementId}`;
}

function buildEmployeeDetail(user: ProvisionedUser) {
  const summary = buildEmployeeSummary(user);
  const { assignedCourseIds, assignedPolicyIds } = getUserAssignments(user);
  const acknowledgements = acknowledgementServiceV2.findHistory({ tenantId: user.tenantId, userId: user.id });
  const overrides = hrOverrideServiceV2.listOverrides(user.tenantId).filter((override) => override.userId === user.id);
  const statuses = buildStatuses(user);
  const activationDeliveries = userImportServiceV2
    .listActivationDeliveryAttempts(user.tenantId, user.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((attempt) => ({
      id: attempt.id,
      activationRecordId: attempt.activationRecordId,
      provider: attempt.provider,
      channel: attempt.channel,
      status: attempt.status,
      destination: attempt.destination,
      message: attempt.message,
      errorMessage: attempt.errorMessage,
      sentAt: iso(attempt.sentAt),
      failedAt: iso(attempt.failedAt),
      createdAt: iso(attempt.createdAt)
    }));

  const assignedCourses = assignedCourseIds
    .map((courseId) => safeCourse(user.tenantId, courseId))
    .filter((course): course is Course => Boolean(course))
    .map((course) => {
      const progress = learningProgressServiceV2.calculateCourseProgress(user.tenantId, user.id, course);
      const requirement = complianceRequirementServiceV2
        .listRequirements(user.tenantId)
        .find((item) => item.requirementType === "course" && item.requirementId === course.id);
      const status = requirement ? statuses.find((item) => item.requirementId === requirement.id)?.status : progress.status;
      return {
        id: course.id,
        title: course.title,
        status: status === "completed" ? "completed" : status === "overdue" ? "overdue" : "pending",
        progress: progress.progressPercent,
        version: currentCourseVersion(course.id)?.versionLabel ?? "Current version"
      };
    });

  const assignedPolicies = assignedPolicyIds
    .map((policyId) => safePolicy(user.tenantId, policyId))
    .filter((policy): policy is Policy => Boolean(policy))
    .map((policy) => {
      const currentVersion = currentPolicyVersion(policy.id);
      const latest = acknowledgements
        .filter((ack) => ack.subjectType === "policy" && ack.subjectId === policy.id && ack.status === "completed")
        .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
      const acknowledgedCurrent = Boolean(latest && (!currentVersion || latest.subjectVersionId === currentVersion.id));
      const requirement = complianceRequirementServiceV2
        .listRequirements(user.tenantId)
        .find((item) => item.requirementType === "policy" && item.requirementId === policy.id);
      const status = requirement ? statuses.find((item) => item.requirementId === requirement.id)?.status : undefined;
      return {
        id: policy.id,
        title: policy.title,
        version: currentVersion?.versionLabel ?? "Current version",
        effectiveDate: iso(currentVersion?.effectiveDate),
        status: acknowledgedCurrent ? "acknowledged" : status === "overdue" ? "overdue" : "pending"
      };
    });

  const acknowledgementTimeline = acknowledgements
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
    .map((record) => ({
      id: record.id,
      date: iso(record.recordedAt),
      title: resolveSubjectTitle(user.tenantId, record),
      version: resolveSubjectVersion(record),
      event: `${record.acknowledgementType} - ${record.status}`,
      actor: record.actorId ?? record.userId,
      readOnly: true
    }));

  const auditLog = [
    ...userImportServiceV2.listAuditEvents(user.tenantId)
      .filter((event) => JSON.stringify(event.details ?? {}).includes(user.id))
      .map((event) => ({
        id: event.id,
        date: iso(event.createdAt),
        event: event.action,
        actor: "System",
        reason: typeof event.details?.reason === "string" ? event.details.reason : undefined
      })),
    ...overrides.map((override) => ({
      id: override.id,
      date: iso(override.recordedAt),
      event: "HR compliance override recorded",
      actor: override.overriddenBy,
      reason: override.reason
    }))
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return {
    ...summary,
    assignedCourses,
    assignedPolicies,
    activationDeliveries,
    acknowledgementTimeline,
    auditLog,
    complianceStatuses: statuses.map((status) => ({ ...status, assignedAt: iso(status.assignedAt), dueDate: iso(status.dueDate), completedAt: iso(status.completedAt) }))
  };
}

function resolveSubjectTitle(tenantId: string, record: AcknowledgementRecord): string {
  if (record.subjectType === "policy") return safePolicy(tenantId, record.subjectId)?.title ?? record.subjectId;
  if (record.subjectType === "course") return safeCourse(tenantId, record.subjectId)?.title ?? record.subjectId;
  return record.subjectId;
}

function resolveSubjectVersion(record: AcknowledgementRecord): string {
  if (!record.subjectVersionId) return "Current version";
  const policyVersion = record.subjectType === "policy" ? policyVersionServiceV2.listVersionHistory(record.subjectId).find((version) => version.id === record.subjectVersionId) : null;
  const courseVersion = record.subjectType === "course" ? courseVersionServiceV2.listVersionHistory(record.subjectId).find((version) => version.id === record.subjectVersionId) : null;
  return policyVersion?.versionLabel ?? courseVersion?.versionLabel ?? record.subjectVersionId;
}

function buildContent(tenantId: string) {
  const employees = userImportServiceV2.listUsers(tenantId);
  const assignments = userImportServiceV2.listAssignments(tenantId);
  const allAcknowledgements = acknowledgementServiceV2.findHistory({ tenantId });
  const allPolicies = policyServiceV2.lookupPolicies(tenantId, {});
  const allCourses = courseServiceV2.getCourseCatalog(tenantId, false);

  const policies = allPolicies.map((policy) => {
    const versions = policyVersionServiceV2.listVersionHistory(policy.id);
    const current = versions.find((version) => version.isCurrent) ?? versions[0] ?? null;
    const assignedCount = assignments.filter((assignment) => assignment.assignedPolicyIds.includes(policy.id)).length;
    const acknowledgedCount = allAcknowledgements.filter(
      (ack) => ack.subjectType === "policy" && ack.subjectId === policy.id && ack.status === "completed" && (!current || ack.subjectVersionId === current.id)
    ).length;
    const reackImpact = current ? allAcknowledgements.filter(
      (ack) => ack.subjectType === "policy" && ack.subjectId === policy.id && ack.status === "completed" && ack.subjectVersionId !== current.id
    ).length : 0;
    return {
      id: policy.id,
      title: policy.title,
      activeVersion: current?.versionLabel ?? "Current version",
      effectiveDate: iso(current?.effectiveDate),
      status: current ? "active" : "draft",
      acknowledgedCount,
      assignedCount,
      reackImpact,
      versions: versions.map((version) => ({
        id: version.id,
        version: version.versionLabel,
        status: version.isCurrent ? "active" : "retired",
        publishedAt: iso(version.publishedAt),
        acknowledgedCount: allAcknowledgements.filter((ack) => ack.subjectVersionId === version.id && ack.status === "completed").length
      }))
    };
  });

  const courses = allCourses.map((course) => {
    const versions = courseVersionServiceV2.listVersionHistory(course.id);
    const current = versions.find((version) => version.isCurrent) ?? versions[0] ?? null;
    const assignedUsers = employees.filter((user) => assignments.some((assignment) => assignment.userId === user.id && assignment.assignedCourseIds.includes(course.id)));
    const completionRates = assignedUsers.map((user) => learningProgressServiceV2.calculateCourseProgress(tenantId, user.id, course).progressPercent);
    const completionRate = completionRates.length === 0 ? 0 : Math.round(completionRates.reduce((total, item) => total + item, 0) / completionRates.length);
    return {
      id: course.id,
      title: course.title,
      activeVersion: current?.versionLabel ?? "Current version",
      status: course.publishedStatus === "published" ? "active" : "draft",
      assignedCount: assignedUsers.length,
      completionRate,
      updatedAt: iso(current?.publishedAt),
      versions: versions.map((version) => ({
        id: version.id,
        version: version.versionLabel,
        status: version.isCurrent ? "active" : "retired",
        updatedAt: iso(version.publishedAt),
        completionRate
      }))
    };
  });

  return { tenantId, policies, courses };
}

function buildDashboard(tenantId: string) {
  const employees = userImportServiceV2.listUsers(tenantId).map(buildEmployeeSummary);
  const totalEmployees = employees.length;
  const compliantEmployees = employees.filter((employee) => employee.complianceStatus === "compliant").length;
  const nonCompliantEmployees = employees.filter((employee) => employee.complianceStatus !== "compliant").length;
  const overdueUsers = employees.filter((employee) => employee.overdueItems > 0).length;
  const onboardingCompletion = totalEmployees === 0 ? 0 : Math.round(employees.reduce((total, employee) => total + employee.onboardingProgress, 0) / totalEmployees);
  const importActivity = userImportServiceV2.listAuditEvents(tenantId).slice(-8).reverse().map((event) => ({
    id: event.id,
    date: iso(event.createdAt),
    title: event.action,
    detail: event.importJobId ? `Import job ${event.importJobId}` : "HR import event",
    tone: event.action.includes("failed") ? "danger" : event.action.includes("completed") ? "success" : "neutral"
  }));
  const acknowledgementActivity = acknowledgementServiceV2.findHistory({ tenantId }).slice(-8).reverse().map((ack) => ({
    id: ack.id,
    date: iso(ack.recordedAt),
    title: "Acknowledgement recorded",
    detail: `${resolveSubjectTitle(tenantId, ack)} ${resolveSubjectVersion(ack)} - ${ack.status}`,
    tone: ack.status === "completed" ? "success" : ack.status === "invalidated" ? "warning" : "neutral"
  }));
  const atRisk = employees.filter((employee) => ["overdue", "non_compliant"].includes(employee.complianceStatus));
  const actionRequired = [
    ...atRisk.map((employee) => ({
      id: `employee-${employee.id}`,
      title: `Follow up with ${employee.name}`,
      detail: employee.nextAction,
      owner: "Compliance",
      urgency: employee.complianceStatus === "non_compliant" ? "critical" : "high"
    })),
    ...userImportServiceV2.listJobs(tenantId)
      .filter((job) => job.status === "preview_ready" && job.failedRows > 0)
      .map((job) => ({
        id: `import-${job.id}`,
        title: "Resolve HR import validation errors",
        detail: `${job.failedRows} rows failed validation in ${job.fileName}`,
        owner: "HR",
        urgency: "high"
      }))
  ].slice(0, 8);

  return {
    tenantId,
    kpis: { totalEmployees, compliantEmployees, nonCompliantEmployees, overdueUsers, onboardingCompletion },
    atRisk,
    recentActivity: [...acknowledgementActivity, ...importActivity]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 8),
    actionRequired
  };
}

adminExperienceRoutes.get("/dashboard", requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]), async (req, res, next) => {
  try {
    const tenantId = await resolveTenantId(req);
    res.json(buildDashboard(tenantId));
  } catch (error) {
    next(error);
  }
});

adminExperienceRoutes.get("/employees", requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]), async (req, res, next) => {
  try {
    const tenantId = await resolveTenantId(req);
    res.json({ tenantId, employees: userImportServiceV2.listUsers(tenantId).map(buildEmployeeSummary) });
  } catch (error) {
    next(error);
  }
});

adminExperienceRoutes.get("/employees/:userId", requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]), async (req, res, next) => {
  try {
    const tenantId = await resolveTenantId(req);
    const user = userImportServiceV2.getUser(tenantId, req.params.userId);
    if (!user) return res.status(404).json({ code: "NOT_FOUND", message: "Employee not found" });
    return res.json({ tenantId, employee: buildEmployeeDetail(user) });
  } catch (error) {
    return next(error);
  }
});

adminExperienceRoutes.post("/employees/:userId/overrides", requireAdminRole(["superadmin", "supportadmin"]), async (req, res, next) => {
  try {
    const parsed = overrideSchema.parse(req.body);
    const tenantId = await resolveTenantId(req);
    const user = userImportServiceV2.getUser(tenantId, req.params.userId);
    if (!user) return res.status(404).json({ code: "NOT_FOUND", message: "Employee not found" });
    const created = hrOverrideServiceV2.createOverride(
      {
        id: `override-${randomUUID()}`,
        tenantId,
        userId: user.id,
        subjectType: parsed.subjectType,
        subjectId: parsed.subjectId,
        subjectVersionId: parsed.subjectVersionId ?? null,
        overriddenBy: req.adminUser?.email ?? "unknown-admin",
        reason: parsed.reason,
        recordedAt: new Date()
      },
      complianceConfigServiceV2.getConfig(tenantId)
    );
    acknowledgementServiceV2.recordAcknowledgement(created.acknowledgement, complianceConfigServiceV2.getConfig(tenantId), false);
    adminAuditService.record(req.adminUser!, "compliance.hr_override.create", tenantId, {
      userId: user.id,
      subjectId: parsed.subjectId,
      reason: parsed.reason
    });
    return res.status(201).json({ tenantId, employee: buildEmployeeDetail(user), override: created.override });
  } catch (error) {
    return next(error);
  }
});

adminExperienceRoutes.get("/content", requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]), async (req, res, next) => {
  try {
    const tenantId = await resolveTenantId(req);
    res.json(buildContent(tenantId));
  } catch (error) {
    next(error);
  }
});

adminExperienceRoutes.post("/policies/:policyId/versions", requireAdminRole(["superadmin", "supportadmin"]), async (req, res, next) => {
  try {
    const parsed = publishPolicySchema.parse(req.body);
    const tenantId = await resolveTenantId(req);
    const policy = policyServiceV2.getPolicyById(tenantId, req.params.policyId);
    const version = policyVersionServiceV2.createVersion({
      id: `policy-version-${policy.id}-${randomUUID()}`,
      policyId: policy.id,
      tenantId,
      versionLabel: parsed.versionLabel,
      documentReference: parsed.documentReference ?? policy.documentReference,
      effectiveDate: parsed.effectiveDate ? new Date(parsed.effectiveDate) : new Date(),
      publishedBy: req.adminUser?.email ?? null,
      publishedAt: new Date(),
      isCurrent: true,
      changeSummary: parsed.changeSummary ?? null
    });
    const nextAcknowledgements = policyVersionServiceV2.invalidateAcknowledgementsForPolicy(
      policy.id,
      acknowledgementServiceV2.findHistory({ tenantId, subjectType: "policy", subjectId: policy.id })
    );
    acknowledgementServiceV2.replaceAcknowledgementsForTenant(tenantId, nextAcknowledgements);
    adminAuditService.record(req.adminUser!, "policy.version.publish", tenantId, { policyId: policy.id, versionId: version.id });
    res.status(201).json(buildContent(tenantId));
  } catch (error) {
    next(error);
  }
});

adminExperienceRoutes.post("/courses/:courseId/versions", requireAdminRole(["superadmin", "supportadmin"]), async (req, res, next) => {
  try {
    const parsed = publishCourseSchema.parse(req.body);
    const tenantId = await resolveTenantId(req);
    const course = courseServiceV2.getCourseById(tenantId, req.params.courseId);
    const version = courseVersionServiceV2.createVersion({
      id: `course-version-${course.id}-${randomUUID()}`,
      courseId: course.id,
      tenantId,
      versionLabel: parsed.versionLabel,
      publishedBy: req.adminUser?.email ?? null,
      publishedAt: new Date(),
      isCurrent: true,
      changeSummary: parsed.changeSummary ?? null
    });
    adminAuditService.record(req.adminUser!, "course.version.publish", tenantId, { courseId: course.id, versionId: version.id });
    res.status(201).json(buildContent(tenantId));
  } catch (error) {
    next(error);
  }
});

adminExperienceRoutes.get("/settings", requireAdminRole(["superadmin", "supportadmin", "readonlyadmin"]), async (req, res, next) => {
  try {
    const tenantId = await resolveTenantId(req);
    const tenant = await tenantServiceV2.getTenantById(tenantId);
    const config = complianceConfigServiceV2.getConfig(tenantId);
    res.json({
      tenantId,
      tenantName: tenant.organizationName,
      appName: typeof tenant.metadata?.appName === "string" ? tenant.metadata.appName : `${tenant.organizationName} Learning`,
      brandColor: typeof tenant.metadata?.brandColor === "string" ? tenant.metadata.brandColor : "#1d3557",
      activationMode: "Activation link",
      downloadPolicy: config.downloadPolicy,
      accessPolicy: "Admin authorized, employee session required",
      evidenceRetention: typeof tenant.metadata?.evidenceRetention === "string" ? tenant.metadata.evidenceRetention : "7 years",
      complianceDueDays: config.defaultRefresherPeriodDays ?? 365,
      allowedIpRanges: config.allowedIpRanges ?? []
    });
  } catch (error) {
    next(error);
  }
});

adminExperienceRoutes.patch("/settings", requireAdminRole(["superadmin", "supportadmin"]), async (req, res, next) => {
  try {
    const parsed = settingsPatchSchema.parse(req.body);
    const tenantId = await resolveTenantId(req);
    const tenant = await tenantServiceV2.getTenantById(tenantId);
    const metadata = {
      ...(tenant.metadata ?? {}),
      ...(parsed.appName ? { appName: parsed.appName } : {}),
      ...(parsed.brandColor ? { brandColor: parsed.brandColor } : {})
    };
    if (parsed.organizationName || parsed.appName || parsed.brandColor) {
      await tenantServiceV2.updateTenant(tenantId, {
        organizationName: parsed.organizationName ?? tenant.organizationName,
        metadata
      });
    }
    if (parsed.downloadPolicy || parsed.allowedIpRanges || parsed.complianceDueDays) {
      complianceConfigServiceV2.upsertConfig(tenantId, {
        ...(parsed.downloadPolicy ? { downloadPolicy: parsed.downloadPolicy } : {}),
        ...(parsed.allowedIpRanges ? { allowedIpRanges: parsed.allowedIpRanges } : {}),
        ...(parsed.complianceDueDays ? { defaultRefresherPeriodDays: parsed.complianceDueDays } : {})
      });
    }
    adminAuditService.record(req.adminUser!, "tenant.settings.update", tenantId, {
      fields: Object.keys(parsed).filter((key) => key !== "tenantId")
    });
    const responseTenant = await tenantServiceV2.getTenantById(tenantId);
    const config = complianceConfigServiceV2.getConfig(tenantId);
    res.json({
      tenantId,
      tenantName: responseTenant.organizationName,
      appName: typeof responseTenant.metadata?.appName === "string" ? responseTenant.metadata.appName : `${responseTenant.organizationName} Learning`,
      brandColor: typeof responseTenant.metadata?.brandColor === "string" ? responseTenant.metadata.brandColor : "#1d3557",
      activationMode: "Activation link",
      downloadPolicy: config.downloadPolicy,
      accessPolicy: "Admin authorized, employee session required",
      evidenceRetention: typeof responseTenant.metadata?.evidenceRetention === "string" ? responseTenant.metadata.evidenceRetention : "7 years",
      complianceDueDays: config.defaultRefresherPeriodDays ?? 365,
      allowedIpRanges: config.allowedIpRanges ?? []
    });
  } catch (error) {
    next(error);
  }
});
