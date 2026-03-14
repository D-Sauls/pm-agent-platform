import type { Course, KnowledgeIndexEntry, Policy } from "../../models/knowledgeModels.js";

export class KnowledgeIndexService {
  private readonly entries = new Map<string, KnowledgeIndexEntry[]>();

  indexCourses(courses: Course[]): void {
    for (const course of courses) {
      const tenantEntries = this.entries.get(course.tenantId) ?? [];
      tenantEntries.push({
        id: `course:${course.id}`,
        tenantId: course.tenantId,
        sourceType: "course",
        sourceId: course.id,
        title: course.title,
        tags: course.tags,
        roleTargets: course.roleTargets,
        summary: course.description
      });
      for (const module of course.modules) {
        for (const lesson of module.lessons) {
          tenantEntries.push({
            id: `lesson:${lesson.id}`,
            tenantId: course.tenantId,
            sourceType: "lesson",
            sourceId: lesson.id,
            title: lesson.title,
            tags: course.tags,
            roleTargets: course.roleTargets,
            summary: `${module.title} / ${lesson.contentType}`
          });
        }
      }
      this.entries.set(course.tenantId, tenantEntries);
    }
  }

  indexPolicies(policies: Policy[]): void {
    for (const policy of policies) {
      const tenantEntries = this.entries.get(policy.tenantId) ?? [];
      tenantEntries.push({
        id: `policy:${policy.id}`,
        tenantId: policy.tenantId,
        sourceType: "policy",
        sourceId: policy.id,
        title: policy.title,
        tags: policy.tags,
        roleTargets: policy.applicableRoles,
        summary: `${policy.category} policy`
      });
      this.entries.set(policy.tenantId, tenantEntries);
    }
  }

  search(tenantId: string, query: string, role?: string): KnowledgeIndexEntry[] {
    const normalized = query.toLowerCase();
    return (this.entries.get(tenantId) ?? []).filter((entry) => {
      const matchesQuery = `${entry.title} ${entry.summary} ${entry.tags.join(" ")}`
        .toLowerCase()
        .includes(normalized);
      const matchesRole = !role || entry.roleTargets.length === 0 || entry.roleTargets.includes(role);
      return matchesQuery && matchesRole;
    });
  }
}
