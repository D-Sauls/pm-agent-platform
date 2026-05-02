import assert from "node:assert/strict";
import test from "node:test";
import type { Server } from "node:http";
import { Buffer } from "node:buffer";
import { createApp } from "../src/app.js";
import {
  complianceConfigServiceV2,
  complianceRequirementServiceV2,
  courseServiceV2,
  courseVersionServiceV2,
  knowledgeIndexServiceV2,
  onboardingPathServiceV2,
  policyServiceV2,
  policyVersionServiceV2,
  repositories,
  roleProfileServiceV2,
  tenantServiceV2
} from "../src/core/container.js";

async function listen(): Promise<{ base: string; close: () => Promise<void> }> {
  const app = createApp();
  const server: Server = app.listen(0);
  return new Promise((resolve, reject) => {
    server.once("listening", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to resolve test server port."));
        return;
      }
      resolve({
        base: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(() => done()))
      });
    });
    server.once("error", reject);
  });
}

async function loginAdmin(base: string): Promise<string> {
  const response = await fetch(`${base}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@local.dev", password: "ChangeMe123!" })
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { token: string };
  return body.token;
}

function activationTokenFromDelivery(delivery: { preview?: { activationUrl?: string } }): string {
  const url = delivery.preview?.activationUrl;
  assert.ok(url, "local activation delivery should expose a preview activation URL");
  return new URL(url).searchParams.get("activationToken") ?? "";
}

async function setupHungryLionTenant(tenantId: string): Promise<void> {
  await tenantServiceV2.createTenant({
    tenantId,
    organizationName: "Hungry Lion Foods",
    status: "active",
    licenseStatus: "active",
    planType: "enterprise",
    defaultPromptVersion: "onboarding_assistant:v1",
    enabledConnectors: ["microsoft-graph", "sharepoint", "teams"],
    featureFlags: ["pwa", "hr-import", "compliance"],
    metadata: {
      appName: "Hungry Lion Academy",
      brandColor: "#f59e0b"
    }
  });
  await repositories.licenseRepository.upsert({
    tenantId,
    status: "active",
    planType: "enterprise",
    expiryDate: null,
    trialEndsAt: null,
    lastValidatedAt: new Date()
  });
  complianceConfigServiceV2.upsertConfig(tenantId, {
    acknowledgementRequiredDefault: true,
    signatureRequiredDefault: false,
    hrOverrideEnabled: true,
    refresherEnabled: true,
    readReceiptMode: "acceptance_tracking",
    downloadPolicy: "authenticated_only",
    defaultRefresherPeriodDays: 365,
    allowedIpRanges: []
  });

  const courses = [
    {
      id: `${tenantId}-course-kitchen-safety`,
      tenantId,
      title: "Kitchen Hygiene and Food Safety",
      description: "Required kitchen onboarding for safe food handling.",
      tags: ["kitchen", "safety"],
      roleTargets: ["Kitchen Staff", "Branch Manager"],
      publishedStatus: "published" as const,
      modules: [
        {
          id: `${tenantId}-module-kitchen-basics`,
          courseId: `${tenantId}-course-kitchen-safety`,
          title: "Kitchen Basics",
          lessons: [
            {
              id: `${tenantId}-lesson-handwash`,
              moduleId: `${tenantId}-module-kitchen-basics`,
              title: "Handwashing procedure",
              contentType: "video" as const,
              contentReference: "/media/hungry-lion/handwash.mp4",
              estimatedDuration: 8
            }
          ]
        }
      ]
    },
    {
      id: `${tenantId}-course-manager-opening`,
      tenantId,
      title: "Branch Manager Opening Checklist",
      description: "Daily branch opening and escalation procedures.",
      tags: ["operations", "manager"],
      roleTargets: ["Branch Manager"],
      publishedStatus: "published" as const,
      modules: [
        {
          id: `${tenantId}-module-manager-basics`,
          courseId: `${tenantId}-course-manager-opening`,
          title: "Opening Controls",
          lessons: [
            {
              id: `${tenantId}-lesson-opening`,
              moduleId: `${tenantId}-module-manager-basics`,
              title: "Opening checklist",
              contentType: "markdown" as const,
              contentReference: "/content/hungry-lion/opening.md",
              estimatedDuration: 12
            }
          ]
        }
      ]
    },
    {
      id: `${tenantId}-course-hr-onboarding`,
      tenantId,
      title: "HR Onboarding Administration",
      description: "How HR administrators manage onboarding evidence safely.",
      tags: ["hr", "admin"],
      roleTargets: ["HR Administrator"],
      publishedStatus: "published" as const,
      modules: [
        {
          id: `${tenantId}-module-hr-basics`,
          courseId: `${tenantId}-course-hr-onboarding`,
          title: "HR Basics",
          lessons: [
            {
              id: `${tenantId}-lesson-hr-evidence`,
              moduleId: `${tenantId}-module-hr-basics`,
              title: "Evidence handling",
              contentType: "markdown" as const,
              contentReference: "/content/hungry-lion/hr-evidence.md",
              estimatedDuration: 10
            }
          ]
        }
      ]
    }
  ];
  for (const course of courses) {
    courseServiceV2.createCourse(course);
    courseVersionServiceV2.createVersion({
      id: `${course.id}-v1`,
      courseId: course.id,
      tenantId,
      versionLabel: "v1",
      publishedAt: new Date(),
      publishedBy: "simulation",
      isCurrent: true,
      changeSummary: "Initial rollout content"
    });
  }
  knowledgeIndexServiceV2.indexCourses(courses);

  const policies = [
    {
      id: `${tenantId}-policy-food-safety`,
      tenantId,
      title: "Food Safety Policy",
      category: "Safety",
      documentReference: "/policies/hungry-lion/food-safety.pdf",
      tags: ["kitchen", "safety"],
      applicableRoles: ["Kitchen Staff", "Branch Manager"]
    },
    {
      id: `${tenantId}-policy-code-of-conduct`,
      tenantId,
      title: "Code of Conduct",
      category: "People",
      documentReference: "/policies/hungry-lion/code-of-conduct.pdf",
      tags: ["hr", "conduct"],
      applicableRoles: ["Kitchen Staff", "Branch Manager", "HR Administrator"]
    }
  ];
  for (const policy of policies) {
    policyServiceV2.createPolicy(policy);
    policyVersionServiceV2.createVersion({
      id: `${policy.id}-v1`,
      policyId: policy.id,
      tenantId,
      versionLabel: "v1",
      documentReference: policy.documentReference,
      effectiveDate: new Date("2026-05-01T00:00:00.000Z"),
      publishedBy: "simulation",
      publishedAt: new Date(),
      isCurrent: true,
      changeSummary: "Initial rollout policy"
    });
  }
  knowledgeIndexServiceV2.indexPolicies(policies);

  const roleProfiles = [
    ["Kitchen Staff", "Kitchen", "Frontline food preparation staff"],
    ["Branch Manager", "Operations", "Branch operations leader"],
    ["HR Administrator", "HR", "HR onboarding administrator"],
    ["Finance Clerk", "Finance", "Finance support"],
    ["IT Support", "IT", "IT support"]
  ] as const;
  for (const [roleName, department, description] of roleProfiles) {
    await roleProfileServiceV2.create({
      id: `${tenantId}-role-${roleName.toLowerCase().replace(/\s+/g, "-")}`,
      tenantId,
      roleName,
      department,
      description
    });
  }

  const roles = await roleProfileServiceV2.list(tenantId);
  const roleByName = (roleName: string) => roles.find((role) => role.roleName === roleName)!;
  await onboardingPathServiceV2.create({
    id: `${tenantId}-path-kitchen`,
    tenantId,
    roleId: roleByName("Kitchen Staff").id,
    courseIds: [`${tenantId}-course-kitchen-safety`],
    policyIds: [`${tenantId}-policy-food-safety`, `${tenantId}-policy-code-of-conduct`],
    estimatedDuration: 45,
    version: "v1"
  });
  await onboardingPathServiceV2.create({
    id: `${tenantId}-path-manager`,
    tenantId,
    roleId: roleByName("Branch Manager").id,
    courseIds: [`${tenantId}-course-kitchen-safety`, `${tenantId}-course-manager-opening`],
    policyIds: [`${tenantId}-policy-food-safety`, `${tenantId}-policy-code-of-conduct`],
    estimatedDuration: 75,
    version: "v1"
  });
  await onboardingPathServiceV2.create({
    id: `${tenantId}-path-hr`,
    tenantId,
    roleId: roleByName("HR Administrator").id,
    courseIds: [`${tenantId}-course-hr-onboarding`],
    policyIds: [`${tenantId}-policy-code-of-conduct`],
    estimatedDuration: 35,
    version: "v1"
  });

  const requirements = [
    ["course", `${tenantId}-course-kitchen-safety`, ["Kitchen Staff", "Branch Manager"], ["Kitchen", "Operations"], 7],
    ["course", `${tenantId}-course-manager-opening`, ["Branch Manager"], ["Operations"], 5],
    ["course", `${tenantId}-course-hr-onboarding`, ["HR Administrator"], ["HR"], 10],
    ["policy", `${tenantId}-policy-food-safety`, ["Kitchen Staff", "Branch Manager"], ["Kitchen", "Operations"], 3],
    ["policy", `${tenantId}-policy-code-of-conduct`, ["Kitchen Staff", "Branch Manager", "HR Administrator"], [], 7]
  ] as const;
  for (const [requirementType, requirementId, roles, departments, dueInDays] of requirements) {
    complianceRequirementServiceV2.createRequirement({
      id: `${tenantId}-req-${requirementId.split("-").slice(-2).join("-")}`,
      tenantId,
      requirementType,
      requirementId,
      appliesToRoles: [...roles],
      appliesToDepartments: [...departments],
      mandatory: true,
      dueInDays,
      refresherPeriodDays: 365,
      acknowledgementRequired: true,
      signatureRequired: false
    });
  }
}

test("Hungry Lion Foods rollout simulation validates tenant, HR import, employee journeys, admin reporting, and negative paths", async () => {
  const tenantId = `tenant-hungry-lion-${Date.now()}`;
  await setupHungryLionTenant(tenantId);
  const server = await listen();

  try {
    const adminToken = await loginAdmin(server.base);
    const adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    };

    const settingsPatch = await fetch(`${server.base}/api/admin/experience/settings`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        tenantId,
        organizationName: "Hungry Lion Foods",
        appName: "Hungry Lion Academy",
        brandColor: "#f59e0b",
        downloadPolicy: "authenticated_only",
        complianceDueDays: 180
      })
    });
    assert.equal(settingsPatch.status, 200);
    const settings = (await settingsPatch.json()) as { tenantName: string; appName: string; downloadPolicy: string };
    assert.equal(settings.tenantName, "Hungry Lion Foods");
    assert.equal(settings.appName, "Hungry Lion Academy");
    assert.equal(settings.downloadPolicy, "authenticated_only");

    const rows = [
      "employeeCode,firstName,lastName,workEmail,department,roleName,managerEmail,startDate,employmentType,location,status",
      "HL001,Amanda,Ndlovu,amanda.ndlovu@hungrylion.example,Kitchen,Kitchen Staff,manager@hungrylion.example,2026-05-06,Full-time,Cape Town,Active",
      "HL002,Thabo,Mokoena,thabo.mokoena@hungrylion.example,Kitchen,Kitchen Staff,manager@hungrylion.example,2026-05-06,Full-time,Cape Town,Active",
      "HL003,Sarah,Jacobs,sarah.jacobs@hungrylion.example,Operations,Branch Manager,regional@hungrylion.example,2026-05-04,Full-time,Johannesburg,Active",
      "HL004,Peter,Naidoo,petern@hungrylion.example,Operations,Branch Manager,regional@hungrylion.example,2026-05-04,Full-time,Durban,Active",
      "HL005,Lindiwe,Dlamini,lindiwe.dlamini@hungrylion.example,HR,HR Administrator,hrlead@hungrylion.example,2026-05-02,Full-time,Cape Town,Active",
      "HL006,Jan,van Wyk,jan.vanwyk@hungrylion.example,Finance,Finance Clerk,financelead@hungrylion.example,2026-05-07,Full-time,Cape Town,Active",
      "HL007,Naledi,Peters,naledi.peters@hungrylion.example,IT,IT Support,itlead@hungrylion.example,2026-05-07,Full-time,Remote,Active",
      "HL008,Musa,Khumalo,musa.khumalo@hungrylion.example,Training,Kitchen Staff,trainer@hungrylion.example,2026-05-08,Part-time,Durban,Active",
      "HL009,Rachel,Smith,rachel.smith@hungrylion.example,Kitchen,Kitchen Staff,manager@hungrylion.example,2026-05-09,Full-time,Port Elizabeth,Active",
      "HL010,David,Botha,david.botha@hungrylion.example,Operations,Branch Manager,regional@hungrylion.example,2026-05-09,Full-time,Pretoria,Active"
    ].join("\n");

    const upload = await fetch(`${server.base}/api/admin/hr-import/jobs`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        tenantId,
        fileName: "hungry-lion-hr-import.csv",
        fileType: "csv",
        fileContentBase64: Buffer.from(rows, "utf8").toString("base64")
      })
    });
    assert.equal(upload.status, 201);
    const uploadBody = (await upload.json()) as { job: { id: string; totalRows: number }; rows: Array<{ validationStatus: string; warningMessages: string[] }> };
    assert.equal(uploadBody.job.totalRows, 10);
    assert.equal(uploadBody.rows.filter((row) => row.validationStatus === "invalid").length, 0);
    assert.ok(uploadBody.rows.some((row) => row.validationStatus === "warning"), "unmapped Training/Kitchen Staff row should warn but not block import");

    const process = await fetch(`${server.base}/api/admin/hr-import/jobs/${uploadBody.job.id}/process`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ tenantId })
    });
    assert.equal(process.status, 200);
    const processed = (await process.json()) as {
      job: { successfulRows: number; failedRows: number };
      provisionedUsers: Array<{ id: string; employeeCode: string; roleName: string; department: string }>;
      assignmentOutcomes: Array<{ userId: string; assignedCourseIds: string[]; assignedPolicyIds: string[] }>;
      activationDeliveries: Array<{ userId: string; preview?: { activationUrl?: string } }>;
    };
    assert.equal(processed.job.successfulRows, 10);
    assert.equal(processed.job.failedRows, 0);
    assert.equal(processed.provisionedUsers.length, 10);
    assert.ok(processed.assignmentOutcomes.some((outcome) => outcome.assignedCourseIds.includes(`${tenantId}-course-kitchen-safety`)));

    const employeeByCode = (code: string) => processed.provisionedUsers.find((user) => user.employeeCode === code)!;
    const deliveryFor = (userId: string) => processed.activationDeliveries.find((delivery) => delivery.userId === userId)!;
    const personas = [
      { code: "HL001", courseId: `${tenantId}-course-kitchen-safety`, lessonId: `${tenantId}-lesson-handwash`, moduleId: `${tenantId}-module-kitchen-basics`, policyId: `${tenantId}-policy-food-safety` },
      { code: "HL003", courseId: `${tenantId}-course-manager-opening`, lessonId: `${tenantId}-lesson-opening`, moduleId: `${tenantId}-module-manager-basics`, policyId: `${tenantId}-policy-food-safety` },
      { code: "HL005", courseId: `${tenantId}-course-hr-onboarding`, lessonId: `${tenantId}-lesson-hr-evidence`, moduleId: `${tenantId}-module-hr-basics`, policyId: `${tenantId}-policy-code-of-conduct` }
    ];

    const sessions: Array<{ code: string; token: string; userId: string; policyId: string }> = [];
    for (const persona of personas) {
      const user = employeeByCode(persona.code);
      const token = activationTokenFromDelivery(deliveryFor(user.id));
      const activation = await fetch(`${server.base}/api/auth/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, token, password: "HungryLion123!" })
      });
      assert.equal(activation.status, 200);
      const activated = (await activation.json()) as { sessionToken: string; user: { id: string; employeeCode: string } };
      assert.equal(activated.user.employeeCode, persona.code);

      const login = await fetch(`${server.base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({ username: persona.code, password: "HungryLion123!" })
      });
      assert.equal(login.status, 200);
      const loggedIn = (await login.json()) as { sessionToken: string };
      const employeeHeaders = { Authorization: `Bearer ${loggedIn.sessionToken}`, "x-tenant-id": tenantId, "Content-Type": "application/json" };

      const onboarding = await fetch(`${server.base}/api/onboarding/progress`, { headers: employeeHeaders });
      assert.equal(onboarding.status, 200);
      const onboardingBody = (await onboarding.json()) as { recommendation: { onboardingPath: { id: string } | null } };
      assert.ok(onboardingBody.recommendation.onboardingPath);

      const progress = await fetch(`${server.base}/api/learning/progress`, {
        method: "POST",
        headers: employeeHeaders,
        body: JSON.stringify({
          courseId: persona.courseId,
          moduleId: persona.moduleId,
          lessonId: persona.lessonId,
          completionStatus: "completed"
        })
      });
      assert.equal(progress.status, 201);

      const acknowledgement = await fetch(`${server.base}/api/compliance/acknowledgements`, {
        method: "POST",
        headers: employeeHeaders,
        body: JSON.stringify({
          subjectType: "policy",
          subjectId: persona.policyId,
          acknowledgementType: "accepted"
        })
      });
      assert.equal(acknowledgement.status, 201);
      const acknowledgementBody = (await acknowledgement.json()) as { userId: string; subjectVersionId: string; status: string };
      assert.equal(acknowledgementBody.userId, activated.user.id);
      assert.ok(acknowledgementBody.subjectVersionId);
      assert.equal(acknowledgementBody.status, "completed");
      sessions.push({ code: persona.code, token: loggedIn.sessionToken, userId: activated.user.id, policyId: persona.policyId });
    }

    const dashboard = await fetch(`${server.base}/api/admin/experience/dashboard?tenantId=${tenantId}`, {
      headers: adminHeaders
    });
    assert.equal(dashboard.status, 200);
    const dashboardBody = (await dashboard.json()) as { kpis: { totalEmployees: number; onboardingCompletion: number }; atRisk: unknown[] };
    assert.equal(dashboardBody.kpis.totalEmployees, 10);
    assert.ok(dashboardBody.kpis.onboardingCompletion >= 0);
    assert.ok(Array.isArray(dashboardBody.atRisk));

    const detail = await fetch(`${server.base}/api/admin/experience/employees/${sessions[0].userId}?tenantId=${tenantId}`, {
      headers: adminHeaders
    });
    assert.equal(detail.status, 200);
    const detailBody = (await detail.json()) as { employee: { acknowledgementTimeline: unknown[]; auditLog: unknown[] } };
    assert.ok(detailBody.employee.acknowledgementTimeline.length >= 1);
    assert.ok(Array.isArray(detailBody.employee.auditLog));

    const content = await fetch(`${server.base}/api/admin/experience/content?tenantId=${tenantId}`, { headers: adminHeaders });
    assert.equal(content.status, 200);
    const contentBody = (await content.json()) as { policies: Array<{ id: string; assignedCount: number; reackImpact: number }> };
    const foodSafety = contentBody.policies.find((policy) => policy.id === `${tenantId}-policy-food-safety`)!;
    assert.ok(foodSafety.assignedCount >= 1);

    const publish = await fetch(`${server.base}/api/admin/experience/policies/${foodSafety.id}/versions`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        tenantId,
        versionLabel: "v2",
        effectiveDate: "2026-06-01",
        changeSummary: "Updated allergen handling section"
      })
    });
    assert.equal(publish.status, 201);
    const afterPublish = (await publish.json()) as { policies: Array<{ id: string; reackImpact: number }> };
    assert.ok(afterPublish.policies.find((policy) => policy.id === foodSafety.id)!.reackImpact >= 1);

    const duplicateRows = [
      "employeeCode,firstName,lastName,workEmail,department,roleName",
      "HL011,Duplicate,One,dup1@hungrylion.example,Kitchen,Kitchen Staff",
      "HL011,Duplicate,Two,dup2@hungrylion.example,Kitchen,Kitchen Staff"
    ].join("\n");
    const duplicateUpload = await fetch(`${server.base}/api/admin/hr-import/jobs`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        tenantId,
        fileName: "hungry-lion-duplicates.csv",
        fileContentBase64: Buffer.from(duplicateRows, "utf8").toString("base64")
      })
    });
    assert.equal(duplicateUpload.status, 201);
    const duplicateBody = (await duplicateUpload.json()) as { rows: Array<{ validationStatus: string; errorMessages: string[] }> };
    assert.equal(duplicateBody.rows[1].validationStatus, "invalid");

    const expiredRows = [
      "employeeCode,firstName,lastName,workEmail,department,roleName",
      "HL099,Expired,Token,expired@hungrylion.example,Kitchen,Kitchen Staff"
    ].join("\n");
    const expiredUpload = await fetch(`${server.base}/api/admin/hr-import/jobs`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        tenantId,
        fileName: "hungry-lion-expired.csv",
        fileContentBase64: Buffer.from(expiredRows, "utf8").toString("base64")
      })
    });
    const expiredUploadBody = (await expiredUpload.json()) as { job: { id: string } };
    const expiredProcess = await fetch(`${server.base}/api/admin/hr-import/jobs/${expiredUploadBody.job.id}/process`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ tenantId, config: { activationTtlHours: -1 } })
    });
    assert.equal(expiredProcess.status, 200);
    const expiredBody = (await expiredProcess.json()) as { activationDeliveries: Array<{ preview?: { activationUrl?: string } }> };
    const expiredToken = activationTokenFromDelivery(expiredBody.activationDeliveries[0]);
    const expiredActivation = await fetch(`${server.base}/api/auth/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, token: expiredToken, password: "HungryLion123!" })
    });
    assert.equal(expiredActivation.status, 401);

    const wrongPassword = await fetch(`${server.base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
      body: JSON.stringify({ username: "HL001", password: "wrong-password" })
    });
    assert.equal(wrongPassword.status, 401);

    const wrongTenant = await fetch(`${server.base}/api/learning/courses`, {
      headers: { Authorization: `Bearer ${sessions[0].token}`, "x-tenant-id": "tenant-beta" }
    });
    assert.equal(wrongTenant.status, 403);

    const staleAck = await fetch(`${server.base}/api/compliance/acknowledgements`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sessions[0].token}`, "x-tenant-id": tenantId, "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectType: "policy",
        subjectId: `${tenantId}-policy-food-safety`,
        subjectVersionId: `${tenantId}-policy-food-safety-v1`,
        acknowledgementType: "accepted"
      })
    });
    assert.equal(staleAck.status, 400);
  } finally {
    await server.close();
  }
});
