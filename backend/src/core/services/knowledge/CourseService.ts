import { AppError } from "../../errors/AppError.js";
import type { Course } from "../../models/knowledgeModels.js";

export interface CreateCourseInput extends Omit<Course, "publishedStatus"> {
  publishedStatus?: Course["publishedStatus"];
}

export interface CourseCatalogRepository {
  upsert(course: Course): Course;
  getById(tenantId: string, courseId: string): Course | null;
  listByTenant(tenantId: string): Course[];
}

export class CourseService {
  private readonly courses = new Map<string, Course>();

  constructor(private readonly repository?: CourseCatalogRepository) {}

  createCourse(input: CreateCourseInput): Course {
    if (this.repository?.getById(input.tenantId, input.id) || this.courses.has(input.id)) {
      throw new AppError("VALIDATION_ERROR", `Course ${input.id} already exists`, 409);
    }

    const course: Course = {
      ...input,
      publishedStatus: input.publishedStatus ?? "draft"
    };
    if (this.repository) {
      return this.repository.upsert(course);
    }
    this.courses.set(course.id, course);
    return course;
  }

  getCourseById(tenantId: string, courseId: string): Course {
    const stored = this.repository?.getById(tenantId, courseId);
    if (stored) {
      return stored;
    }
    const course = this.courses.get(courseId);
    if (!course || course.tenantId !== tenantId) {
      throw new AppError("PROJECT_NOT_FOUND", `Course ${courseId} not found`, 404);
    }
    return course;
  }

  getCourseCatalog(tenantId: string, publishedOnly = true): Course[] {
    const courses = this.repository?.listByTenant(tenantId) ?? Array.from(this.courses.values());
    return courses.filter(
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
    if (this.repository) {
      return this.repository.upsert(updated);
    }
    this.courses.set(courseId, updated);
    return updated;
  }

  publishCourse(tenantId: string, courseId: string): Course {
    const existing = this.getCourseById(tenantId, courseId);
    const published: Course = { ...existing, publishedStatus: "published" };
    if (this.repository) {
      return this.repository.upsert(published);
    }
    this.courses.set(courseId, published);
    return published;
  }

  seed(courses: Course[]): void {
    for (const course of courses) {
      if (this.repository) {
        this.repository.upsert(course);
        continue;
      }
      this.courses.set(course.id, course);
    }
  }
}
