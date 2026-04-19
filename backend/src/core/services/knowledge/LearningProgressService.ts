import type { CompletionStatus, Course, LearningProgress } from "../../models/knowledgeModels.js";

export class LearningProgressService {
  private readonly progressEntries = new Map<string, LearningProgress>();

  recordProgress(progress: LearningProgress): LearningProgress {
    const key = this.key(progress.tenantId, progress.userId, progress.courseId, progress.lessonId);
    const next: LearningProgress = {
      ...progress,
      completionDate: progress.completionStatus === "completed" ? progress.completionDate ?? new Date() : null
    };
    this.progressEntries.set(key, next);
    return next;
  }

  listProgressForUser(tenantId: string, userId: string, courseId?: string): LearningProgress[] {
    return Array.from(this.progressEntries.values()).filter(
      (entry) => entry.tenantId === tenantId && entry.userId === userId && (!courseId || entry.courseId === courseId)
    );
  }

  calculateCourseProgress(tenantId: string, userId: string, course: Course): {
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
    status: CompletionStatus;
  } {
    const lessons = course.modules.flatMap((module) => module.lessons);
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter((lesson) => {
      const entry = this.progressEntries.get(this.key(tenantId, userId, course.id, lesson.id));
      return entry?.completionStatus === "completed";
    }).length;

    const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    const status: CompletionStatus =
      progressPercent === 100 ? "completed" : progressPercent > 0 ? "in_progress" : "not_started";

    return { progressPercent, completedLessons, totalLessons, status };
  }

  private key(tenantId: string, userId: string, courseId: string, lessonId: string): string {
    return `${tenantId}:${userId}:${courseId}:${lessonId}`;
  }
}
