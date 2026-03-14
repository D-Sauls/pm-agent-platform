import type { CourseVersion } from "../../models/complianceModels.js";
import { loggingService } from "../../../observability/runtime.js";

export class CourseVersionService {
  private versions = new Map<string, CourseVersion[]>();

  createVersion(version: CourseVersion): CourseVersion {
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
