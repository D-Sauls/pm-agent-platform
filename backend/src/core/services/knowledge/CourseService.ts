import { AppError } from "../../errors/AppError.js";
import type { Course } from "../../models/knowledgeModels.js";

export interface CreateCourseInput extends Omit<Course, "publishedStatus"> {
  publishedStatus?: Course["publishedStatus"];
}

export class CourseService {
  private readonly courses = new Map<string, Course>();

  createCourse(input: CreateCourseInput): Course {
    if (this.courses.has(input.id)) {
      throw new AppError("VALIDATION_ERROR", `Course ${input.id} already exists`, 409);
    }

    const course: Course = {
      ...input,
      publishedStatus: input.publishedStatus ?? "draft"
    };
    this.courses.set(course.id, course);
    return course;
  }

  getCourseById(tenantId: string, courseId: string): Course {
    const course = this.courses.get(courseId);
    if (!course || course.tenantId !== tenantId) {
      throw new AppError("PROJECT_NOT_FOUND", `Course ${courseId} not found`, 404);
    }
    return course;
  }

  getCourseCatalog(tenantId: string, publishedOnly = true): Course[] {
    return Array.from(this.courses.values()).filter(
      (course) => course.tenantId === tenantId && (!publishedOnly || course.publishedStatus === "published")
    );
  }

  updateCourseMetadata(
    tenantId: string,
    courseId: string,
    updates: Partial<Pick<Course, "title" | "description" | "tags" | "roleTargets">>
  ): Course {
    const existing = this.getCourseById(tenantId, courseId);
    const updated: Course = { ...existing, ...updates };
    this.courses.set(courseId, updated);
    return updated;
  }

  publishCourse(tenantId: string, courseId: string): Course {
    const existing = this.getCourseById(tenantId, courseId);
    const published: Course = { ...existing, publishedStatus: "published" };
    this.courses.set(courseId, published);
    return published;
  }

  seed(courses: Course[]): void {
    for (const course of courses) {
      this.courses.set(course.id, course);
    }
  }
}
