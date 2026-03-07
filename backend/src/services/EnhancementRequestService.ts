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
}
