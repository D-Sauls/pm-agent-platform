import assert from "node:assert/strict";
import test from "node:test";
import { CourseService } from "../src/core/services/knowledge/CourseService.js";
import { LearningProgressService } from "../src/core/services/knowledge/LearningProgressService.js";

test("LearningProgressService calculates course completion percentage", () => {
  const courseService = new CourseService();
  const progressService = new LearningProgressService();
  const course = courseService.createCourse({
    id: "course-1",
    tenantId: "tenant-acme",
    title: "Finance Onboarding",
    description: "Intro course",
    tags: ["finance"],
    roleTargets: ["Finance Analyst"],
    modules: [
      {
        id: "module-1",
        courseId: "course-1",
        title: "Module 1",
        lessons: [
          {
            id: "lesson-1",
            moduleId: "module-1",
            title: "Lesson 1",
            contentType: "markdown",
            contentReference: "/lesson-1.md",
            estimatedDuration: 10
          },
          {
            id: "lesson-2",
            moduleId: "module-1",
            title: "Lesson 2",
            contentType: "markdown",
            contentReference: "/lesson-2.md",
            estimatedDuration: 10
          }
        ]
      }
    ]
  });

  progressService.recordProgress({
    tenantId: "tenant-acme",
    userId: "user-1",
    courseId: "course-1",
    moduleId: "module-1",
    lessonId: "lesson-1",
    completionStatus: "completed"
  });

  const summary = progressService.calculateCourseProgress("tenant-acme", "user-1", course);
  assert.equal(summary.completedLessons, 1);
  assert.equal(summary.totalLessons, 2);
  assert.equal(summary.progressPercent, 50);
});
