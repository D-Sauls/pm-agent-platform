import assert from "node:assert/strict";
import fs from "node:fs";

process.env.VITE_DEFAULT_TENANT_ID ??= "tenant-acme";
process.env.VITE_SECONDARY_TENANT_ID ??= "tenant-beta";

const { resolveAppSurface } = await import("../dist/surface.js");
const { getAssistantDemoResult, normalizeAssistantMessage } = await import("../dist/assistantDemoData.js");
const { resolveTenantBranding } = await import("../dist/pwa/branding.js");
const { buildApiUrl, withBasePath } = await import("../dist/pwa/runtime.js");
const { buildOfflineManifest, resolveOfflineAvailability, syncAssignedDownloads } = await import("../dist/pwa/workspaceHelpers.js");
const {
  clearEmployeeSession,
  loadEmployeeSession,
  saveEmployeeSession,
  toEmployeeSessionAccess
} = await import("../dist/session/employeeSession.js");

assert.equal(resolveAppSurface("/admin"), "admin");
assert.equal(resolveAppSurface("/teams"), "teams");
assert.equal(resolveAppSurface("/"), "pwa");
assert.equal(resolveAppSurface("/onboarding_training"), "pwa");

assert.equal(resolveTenantBranding("tenant-acme").appName, "Acme Learning Hub");
assert.equal(resolveTenantBranding("unknown", "Contoso").logoText, "CO");

assert.equal(withBasePath("/onboarding_training", "/sw.js"), "/onboarding_training/sw.js");
assert.equal(buildApiUrl("/onboarding_training", "/learning/progress"), "/onboarding_training/api/learning/progress");
assert.equal(buildApiUrl("", "/learning/progress"), "/api/learning/progress");

const mockStorage = {
  data: new Map(),
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  },
  setItem(key, value) {
    this.data.set(key, value);
  },
  removeItem(key) {
    this.data.delete(key);
  }
};

saveEmployeeSession(
  {
    userId: "user-1",
    tenantId: "tenant-acme",
    username: "A100",
    displayName: "Alex User",
    role: "Finance Analyst",
    department: "Finance",
    sessionToken: "token-123"
  },
  mockStorage
);
assert.equal(loadEmployeeSession(mockStorage)?.tenantId, "tenant-acme");
assert.equal(toEmployeeSessionAccess(loadEmployeeSession(mockStorage)).sessionToken, "token-123");
clearEmployeeSession(mockStorage);
assert.equal(loadEmployeeSession(mockStorage), null);

const adminAppSource = fs.readFileSync(new URL("../src/admin/AdminApp.tsx", import.meta.url), "utf8");
const adminLayoutSource = fs.readFileSync(new URL("../src/admin/components/AdminLayout.tsx", import.meta.url), "utf8");
assert.match(adminAppSource, /EmployeeCompliancePage/);
assert.match(adminAppSource, /HrImportPage/);
assert.match(adminAppSource, /ContentManagementPage/);
assert.match(adminAppSource, /TenantSettingsPage/);
assert.doesNotMatch(adminAppSource, /TenantDetailPage|LicenseManagementPage|FeatureFlagsPage|PromptRegistryPage|ConnectorHealthPage/);
assert.match(adminLayoutSource, /HR Import/);
assert.match(adminLayoutSource, /Content/);
assert.match(adminLayoutSource, /Settings/);
const employeeViewsSource = fs.readFileSync(new URL("../src/pwa/EmployeePwaViews.tsx", import.meta.url), "utf8");
const authSource = employeeViewsSource.slice(
  employeeViewsSource.indexOf("export function AuthScreen"),
  employeeViewsSource.indexOf("export function HomeTabView")
);
assert.match(authSource, /Employee ID/);
assert.match(authSource, /Password/);
assert.doesNotMatch(authSource, /tenantId|userId|department|debug|roleName/i);
assert.doesNotMatch(authSource, />\s*Role\s*</i);

const courseDetailSource = employeeViewsSource.slice(
  employeeViewsSource.indexOf("export function CourseDetailView"),
  employeeViewsSource.indexOf("export function PoliciesListView")
);
assert.doesNotMatch(courseDetailSource, /Start next lesson|next assigned lesson|completed\s+lesson/i);

Object.defineProperty(globalThis, "localStorage", { value: mockStorage, configurable: true });
const cachedUrls = [];
Object.defineProperty(globalThis, "caches", {
  value: {
    open: async () => ({
      put: async (url) => {
        cachedUrls.push(String(url));
      },
      delete: async () => true
    })
  },
  configurable: true
});
Object.defineProperty(globalThis, "fetch", {
  value: async (url) => ({
    ok: !String(url).includes("fail"),
    clone() {
      return this;
    }
  }),
  configurable: true
});

const cacheableCourse = {
  id: "course-cacheable",
  tenantId: "tenant-acme",
  title: "Kitchen Safety",
  description: "Assigned kitchen training",
  tags: [],
  roleTargets: [],
  publishedStatus: "published",
  modules: [
    {
      id: "module-1",
      courseId: "course-cacheable",
      title: "Basics",
      lessons: [
        {
          id: "lesson-1",
          moduleId: "module-1",
          title: "Knife safety",
          contentType: "video",
          contentReference: "/media/kitchen-safety.mp4",
          estimatedDuration: 5
        }
      ]
    }
  ]
};
const onlineOnlyCourse = {
  ...cacheableCourse,
  id: "course-online-only",
  title: "External Menu Training",
  modules: [
    {
      id: "module-2",
      courseId: "course-online-only",
      title: "External",
      lessons: [
        {
          id: "lesson-2",
          moduleId: "module-2",
          title: "External menu link",
          contentType: "external_reference",
          contentReference: "https://example.com/menu",
          estimatedDuration: 3
        }
      ]
    }
  ]
};

mockStorage.data.clear();
const manifest = buildOfflineManifest([cacheableCourse, onlineOnlyCourse], [], {}, "authenticated_only", true);
const cacheableManifest = manifest.find((item) => item.id === "course:course-cacheable");
const onlineOnlyManifest = manifest.find((item) => item.id === "course:course-online-only");
assert.equal(cacheableManifest.status, "preparing");
assert.equal(resolveOfflineAvailability(cacheableManifest, true).label, "Preparing offline");
assert.equal(onlineOnlyManifest.status, "online_only");
assert.equal(resolveOfflineAvailability(onlineOnlyManifest, true).label, "Online only");

const syncedDownloads = await syncAssignedDownloads(manifest, true, "offline-validation");
const syncedCacheable = syncedDownloads.find((item) => item.id === "course:course-cacheable");
assert.equal(syncedCacheable.status, "ready");
assert.equal(resolveOfflineAvailability(syncedCacheable, true).label, "Available offline");
assert.ok(cachedUrls.some((url) => url.endsWith("/media/kitchen-safety.mp4")));

const failedDownloads = await syncAssignedDownloads(
  [{ ...cacheableManifest, id: "course:failed", urls: ["/media/fail.mp4"], status: "preparing" }],
  true,
  "offline-failure-validation"
);
assert.equal(failedDownloads[0].status, "failed");
assert.equal(resolveOfflineAvailability(failedDownloads[0], true).label, "Sync failed");

const rolePurposeReply = getAssistantDemoResult("What is my job role or the real purpose for me doing these coureses");
assert.equal(rolePurposeReply.goalType, "role_context_demo");
assert.match(rolePurposeReply.response.synthesizedSummary, /purpose/i);

const courseScopeReply = getAssistantDemoResult("Do you think I should do all these courses");
assert.equal(courseScopeReply.goalType, "assignment_scope_demo");
assert.match(courseScopeReply.response.synthesizedSummary, /not treat every course/i);

assert.equal(normalizeAssistantMessage("courese coureses compliace traning complere"), "course courses compliance training complete");

const assistantPromptCases = [
  ["What do you think about these courese", "assignment_scope_demo"],
  ["Do I need to complete every course?", "assignment_scope_demo"],
  ["Are all courses required for me?", "assignment_scope_demo"],
  ["So which course is quicker to complere", "course_duration_demo"],
  ["Which course is the fastest to complete?", "course_duration_demo"],
  ["What is the shortest lesson?", "course_duration_demo"],
  ["What should I do next?", "next_training_step_demo"],
  ["Why am I doing these courses?", "role_context_demo"],
  ["Explain Food Safety Policy v4", "knowledge_lookup_demo"],
  ["What am I missing for compliace?", "compliance_audit_demo"],
  ["Summarize my onboarding path", "onboarding_recommendation_demo"],
  ["hello?", "assistant_guidance_demo"]
];

for (const [prompt, expectedGoalType] of assistantPromptCases) {
  assert.equal(getAssistantDemoResult(prompt).goalType, expectedGoalType, prompt);
}

const overlappingAssistantPromptCases = [
  ["What policy am I missing for compliance?", "compliance_audit_demo"],
  ["Explain what I am missing for compliance", "compliance_audit_demo"],
  ["Which policy is overdue?", "compliance_audit_demo"],
  ["What should I do next for compliance?", "next_training_step_demo"],
  ["What is next in my onboarding path?", "next_training_step_demo"],
  ["Why am I doing the fastest course?", "role_context_demo"],
  ["Do I need every policy and course?", "assignment_scope_demo"],
  ["Do I need to complete every course before acknowledging policy?", "assignment_scope_demo"],
  ["Explain why the fastest course matters", "course_duration_demo"],
  ["Explain compliance policy", "compliance_audit_demo"]
];

for (const [prompt, expectedGoalType] of overlappingAssistantPromptCases) {
  assert.equal(getAssistantDemoResult(prompt).goalType, expectedGoalType, `overlap: ${prompt}`);
}

console.log("frontend smoke tests passed");

