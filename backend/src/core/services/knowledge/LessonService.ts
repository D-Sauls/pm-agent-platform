import { AppError } from "../../errors/AppError.js";
import type { LearningProgress, Lesson } from "../../models/knowledgeModels.js";
import { CourseService } from "./CourseService.js";
import { LearningProgressService } from "./LearningProgressService.js";

export class LessonService {
  constructor(
    private readonly courseService: CourseService,
    private readonly learningProgressService: LearningProgressService
  ) {}

  getLesson(tenantId: string, lessonId: string): Lesson {
    const courses = this.courseService.getCourseCatalog(tenantId, false);
    for (const course of courses) {
      for (const module of course.modules) {
        const lesson = module.lessons.find((entry) => entry.id === lessonId);
        if (lesson) {
          return lesson;
        }
      }
    }
    throw new AppError("PROJECT_NOT_FOUND", `Lesson ${lessonId} not found`, 404);
  }

  listLessonsForCourse(tenantId: string, courseId: string): Lesson[] {
    return this.courseService
      .getCourseById(tenantId, courseId)
      .modules.flatMap((module) => module.lessons);
  }

  trackLessonProgress(progress: LearningProgress): LearningProgress {
    return this.learningProgressService.recordProgress(progress);
  }
}
