import assert from "node:assert/strict";
import test from "node:test";
import { CourseService } from "../src/core/services/knowledge/CourseService.js";
import { LearningProgressService } from "../src/core/services/knowledge/LearningProgressService.js";
import { LessonService } from "../src/core/services/knowledge/LessonService.js";

test("LessonService retrieves lessons from tenant courses", () => {
  const courseService = new CourseService();
  const progressService = new LearningProgressService();
  const lessonService = new LessonService(courseService, progressService);

  courseService.createCourse({
    id: "course-1",
    tenantId: "tenant-acme",
    title: "Finance Onboarding",
    description: "Intro course",
    tags: ["finance"],
    roleTargets: ["Finance Analyst"],
    publishedStatus: "published",
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
          }
        ]
      }
    ]
  });

  const lesson = lessonService.getLesson("tenant-acme", "lesson-1");
  assert.equal(lesson.title, "Lesson 1");
});
