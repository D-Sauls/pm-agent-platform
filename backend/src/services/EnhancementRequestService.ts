import type {
  EnhancementRequest,
  EnhancementStatus
} from "../models/EnhancementRequest.js";

interface ListFilters {
  tenantId?: string;
  status?: EnhancementStatus;
}

// Stores and manages client-submitted enhancement requests.
export class EnhancementRequestService {
  private requests: EnhancementRequest[] = [
    {
      id: "enh-1001",
      tenantId: "tenant-acme",
      submittedBy: "pm@acme.com",
      title: "Add earned value trend chart",
      description: "Need EVM trend in weekly report dashboard.",
      expectedBenefit: "Faster executive trend review.",
      urgency: "medium",
      currentWorkaround: "Manual export to Excel",
      status: "new",
      createdDate: new Date().toISOString(),
      internalNotes: ""
    },
    {
      id: "enh-1002",
      tenantId: "tenant-beta",
      submittedBy: "ops@beta.io",
      title: "Export usage logs to CSV",
      description: "Support team needs downloadable usage logs by tenant.",
      expectedBenefit: "Faster support triage and compliance reporting.",
      urgency: "high",
      currentWorkaround: "Copy values manually from logs page",
      status: "reviewing",
      createdDate: new Date(Date.now() - 2 * 24 * 3600_000).toISOString(),
      internalNotes: "Reviewed by support admin"
    }
  ];

  listRequests(filters?: ListFilters): EnhancementRequest[] {
    return this.requests.filter((request) => {
      if (filters?.tenantId && request.tenantId !== filters.tenantId) {
        return false;
      }
      if (filters?.status && request.status !== filters.status) {
        return false;
      }
      return true;
    });
  }

  updateStatus(id: string, status: EnhancementStatus): EnhancementRequest | null {
    const idx = this.requests.findIndex((request) => request.id === id);
    if (idx < 0) {
      return null;
    }
    this.requests[idx] = { ...this.requests[idx], status };
    return this.requests[idx];
  }

  addInternalNotes(id: string, internalNotes: string): EnhancementRequest | null {
    const idx = this.requests.findIndex((request) => request.id === id);
    if (idx < 0) {
      return null;
    }
    this.requests[idx] = { ...this.requests[idx], internalNotes };
    return this.requests[idx];
  }

  countByStatus(status: EnhancementStatus): number {
    return this.requests.filter((request) => request.status === status).length;
  }
}
