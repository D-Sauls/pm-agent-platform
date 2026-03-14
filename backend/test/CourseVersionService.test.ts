import assert from "node:assert/strict";
import test from "node:test";
import { CourseVersionService } from "../src/core/services/compliance/CourseVersionService.js";

test("CourseVersionService returns current version", () => {
  const service = new CourseVersionService();
  service.createVersion({
    id: "cv1",
    courseId: "course-1",
    tenantId: "tenant-acme",
    versionLabel: "v1",
    publishedAt: new Date("2026-01-01"),
    isCurrent: true
  });

  const current = service.getCurrentVersion("course-1");
  assert.equal(current?.id, "cv1");
});
