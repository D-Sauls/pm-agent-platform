import type { Course, KnowledgeDocument, KnowledgeIndexEntry, Policy } from "../../models/knowledgeModels.js";

export class KnowledgeIndexService {
  private readonly entries = new Map<string, Map<string, KnowledgeIndexEntry>>();

  indexCourses(courses: Course[]): void {
    for (const course of courses) {
      this.upsert(course.tenantId, {
        id: `course:${course.id}`,
        tenantId: course.tenantId,
        sourceType: "course",
        sourceId: course.id,
        sourceSystem: "course_catalog",
        title: course.title,
        tags: course.tags,
        roleTargets: course.roleTargets,
        summary: course.description
      });
      for (const module of course.modules) {
        for (const lesson of module.lessons) {
          this.upsert(course.tenantId, {
            id: `lesson:${lesson.id}`,
            tenantId: course.tenantId,
            sourceType: "lesson",
            sourceId: lesson.id,
            sourceSystem: "course_catalog",
            title: lesson.title,
            tags: course.tags,
            roleTargets: course.roleTargets,
            summary: `${module.title} / ${lesson.contentType}`,
            contentReference: lesson.contentReference
          });
        }
      }
    }
  }

  indexPolicies(policies: Policy[]): void {
    for (const policy of policies) {
      this.upsert(policy.tenantId, {
        id: `policy:${policy.id}`,
        tenantId: policy.tenantId,
        sourceType: "policy",
        sourceId: policy.id,
        sourceSystem: "policy_library",
        title: policy.title,
        tags: policy.tags,
        roleTargets: policy.applicableRoles,
        summary: `${policy.category} policy`,
        documentUrl: policy.documentReference,
        contentReference: policy.documentReference
      });
    }
  }

  indexDocuments(documents: KnowledgeDocument[]): void {
    for (const document of documents) {
      this.upsert(document.tenantId, {
        id: `document:${document.id}`,
        tenantId: document.tenantId,
        sourceType: "document",
        sourceId: document.id,
        sourceSystem: document.sourceSystem,
        title: document.title,
        tags: document.tags,
        roleTargets: document.roleTargets,
        summary: document.summary ?? `${document.sourceSystem} document`,
        documentUrl: document.documentUrl,
        contentReference: document.contentReference
      });
    }
  }

  search(tenantId: string, query: string, role?: string): KnowledgeIndexEntry[] {
    const normalized = query.toLowerCase();
    return this.listEntries(tenantId).filter((entry) => {
      const matchesQuery = `${entry.title} ${entry.summary} ${entry.tags.join(" ")}`.toLowerCase().includes(normalized);
      const matchesRole = !role || entry.roleTargets.length === 0 || entry.roleTargets.includes(role);
      return matchesQuery && matchesRole;
    });
  }

  listEntries(tenantId: string): KnowledgeIndexEntry[] {
    return Array.from(this.entries.get(tenantId)?.values() ?? []);
  }

  listEntriesBySourceType(tenantId: string, sourceType: KnowledgeIndexEntry["sourceType"]): KnowledgeIndexEntry[] {
    return this.listEntries(tenantId).filter((entry) => entry.sourceType === sourceType);
  }

  getEntryBySourceId(tenantId: string, sourceId: string): KnowledgeIndexEntry | null {
    return this.listEntries(tenantId).find((entry) => entry.sourceId === sourceId || entry.id === sourceId) ?? null;
  }

  private upsert(tenantId: string, entry: KnowledgeIndexEntry): void {
    const tenantEntries = this.entries.get(tenantId) ?? new Map<string, KnowledgeIndexEntry>();
    tenantEntries.set(entry.id, entry);
    this.entries.set(tenantId, tenantEntries);
  }
}
