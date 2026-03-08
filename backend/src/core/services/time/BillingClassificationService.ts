import type { BillableStatus, TimeEntry } from "../../models/timeModels.js";

const nonBillableKeywords = [
  "internal",
  "admin",
  "support",
  "operations",
  "training",
  "leave",
  "pto",
  "non billable",
  "non-billable"
];

const billableKeywords = ["billable", "client", "delivery", "project", "implementation"];

export class BillingClassificationService {
  classify(entry: Partial<TimeEntry>): BillableStatus {
    if (entry.billableStatus && entry.billableStatus !== "unknown") {
      return entry.billableStatus;
    }

    const category = (entry.billingCategory ?? "").toLowerCase();
    if (this.includesAny(category, nonBillableKeywords)) {
      return "non_billable";
    }
    if (this.includesAny(category, billableKeywords)) {
      return "billable";
    }

    const text = `${entry.description ?? ""} ${(entry.tags ?? []).join(" ")}`.toLowerCase();
    if (this.includesAny(text, nonBillableKeywords)) {
      return "non_billable";
    }
    if (this.includesAny(text, billableKeywords)) {
      return "billable";
    }

    return "unknown";
  }

  private includesAny(source: string, values: string[]): boolean {
    return values.some((value) => source.includes(value));
  }
}
