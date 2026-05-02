import type { CourseVersion } from "../../models/complianceModels.js";
import { loggingService } from "../../../observability/runtime.js";

export interface CourseVersionStore {
  appendSync(version: CourseVersion): void;
  listByCourseSync(courseId: string): CourseVersion[];
}

export class CourseVersionService {
  private versions = new Map<string, CourseVersion[]>();

  constructor(private readonly store?: CourseVersionStore) {}

  createVersion(version: CourseVersion): CourseVersion {
    if (this.store) {
      const history = this.store.listByCourseSync(version.courseId);
      for (const entry of history) {
        if (entry.isCurrent && entry.id !== version.id) {
          this.store.appendSync({ ...entry, isCurrent: false });
        }
      }
      this.store.appendSync(version);
      loggingService.info("compliance.course_version.published", {
        tenantId: version.tenantId,
        actorId: version.publishedBy ?? "system",
        actorRole: "admin",
        subjectType: "course",
        subjectId: version.courseId
      });
      return version;
    }
    const history = this.versions.get(version.courseId) ?? [];
    const nextHistory = history.map((entry) => ({ ...entry, isCurrent: false }));
    nextHistory.push(version);
    this.versions.set(version.courseId, nextHistory);
    loggingService.info("compliance.course_version.published", {
      tenantId: version.tenantId,
      actorId: version.publishedBy ?? "system",
      actorRole: "admin",
      subjectType: "course",
      subjectId: version.courseId
    });
    return version;
  }

  listVersionHistory(courseId: string): CourseVersion[] {
    if (this.store) {
      return this.store.listByCourseSync(courseId).sort((a, b) => {
        const left = a.publishedAt?.getTime() ?? 0;
        const right = b.publishedAt?.getTime() ?? 0;
        return right - left;
      });
    }
    return (this.versions.get(courseId) ?? []).sort((a, b) => {
      const left = a.publishedAt?.getTime() ?? 0;
      const right = b.publishedAt?.getTime() ?? 0;
      return right - left;
    });
  }

  getCurrentVersion(courseId: string): CourseVersion | null {
    return this.listVersionHistory(courseId).find((entry) => entry.isCurrent) ?? null;
  }
}
