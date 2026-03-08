import type { Tenant } from "../models/Tenant.js";
import type { License } from "../models/License.js";
import type { AdminAuditLog } from "../models/AdminAuditLog.js";
import type { UsageLog } from "../models/UsageLog.js";
import { AdminAuditService } from "./AdminAuditService.js";
import { ConnectorHealthService } from "./ConnectorHealthService.js";
import { EnhancementRequestService } from "./EnhancementRequestService.js";
import { TenantService } from "./TenantService.js";
import { UsageLogService } from "./UsageLogService.js";

export interface DashboardSummary {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  activeLicenses: number;
  failedConnectorSyncs: number;
  enhancementRequestsPendingReview: number;
  totalRequestsLast24Hours: number;
  recentAdminActions: AdminAuditLog[];
  recentWorkflowActivity: UsageLog[];
  topUsedWorkflows: Array<{ requestType: string; count: number }>;
}

// Aggregates operational summary cards for the admin dashboard.
export class AdminDashboardService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly adminAuditService: AdminAuditService,
    private readonly connectorHealthService: ConnectorHealthService,
    private readonly enhancementRequestService: EnhancementRequestService,
    private readonly usageLogService: UsageLogService
  ) {}

  buildSummary(licenses: License[]): DashboardSummary {
    const tenants = this.tenantService.listTenants();
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();

    return {
      totalTenants: tenants.length,
      activeTenants: this.countByStatus(tenants, "active"),
      suspendedTenants: this.countByStatus(tenants, "suspended"),
      activeLicenses: licenses.filter((license) => license.status === "active").length,
      failedConnectorSyncs: this.connectorHealthService.countFailedSyncs(),
      enhancementRequestsPendingReview:
        this.enhancementRequestService.countByStatus("new") +
        this.enhancementRequestService.countByStatus("reviewing"),
      totalRequestsLast24Hours: this.usageLogService.countRequestsSince(since),
      recentAdminActions: this.adminAuditService.listRecent(10),
      recentWorkflowActivity: this.usageLogService.listRecent(10),
      topUsedWorkflows: this.usageLogService.topRequestTypes(5)
    };
  }

  private countByStatus(tenants: Tenant[], status: Tenant["licenseStatus"]): number {
    return tenants.filter((tenant) => tenant.licenseStatus === status).length;
  }
}
