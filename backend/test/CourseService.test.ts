import assert from "node:assert/strict";
import test from "node:test";
import { CourseService } from "../src/core/services/knowledge/CourseService.js";

test("CourseService creates and publishes tenant-scoped courses", () => {
  const service = new CourseService();
  service.createCourse({
    id: "course-1",
    tenantId: "tenant-acme",
    title: "Finance Onboarding",
    description: "Intro course",
    tags: ["finance"],
    roleTargets: ["Finance Analyst"],
    modules: []
  });

  const published = service.publishCourse("tenant-acme", "course-1");
  assert.equal(published.publishedStatus, "published");
  assert.equal(service.getCourseCatalog("tenant-acme").length, 1);
});
