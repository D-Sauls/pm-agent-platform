import type { Tenant } from "../models/Tenant.js";
import type { License } from "../models/License.js";
import type { AdminAuditLog } from "../models/AdminAuditLog.js";
import type { UsageLog } from "../models/UsageLog.js";
import {
  agenticTelemetryService,
  connectorTelemetryService,
  workflowTelemetryService
} from "../observability/runtime.js";
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
  recentConnectorFailures: Array<{
    tenantId: string;
    connectorName: string;
    status: string;
    reason?: string;
    timestamp: string;
  }>;
  recentWorkflowFailures: Array<{
    tenantId?: string;
    workflowId?: string;
    workflowType?: string;
    errorCode?: string;
    timestamp: string;
  }>;
  recentAgenticRuns: Array<{
    planId: string;
    goalType: string;
    workflowsSelected: string[];
    success: boolean;
    timestamp: string;
  }>;
  topAgenticGoalTypes: Array<{ goalType: string; count: number }>;
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
      topUsedWorkflows: this.usageLogService.topRequestTypes(5),
      recentConnectorFailures: connectorTelemetryService.recentFailures(10).map((entry) => ({
        tenantId: entry.tenantId,
        connectorName: entry.connectorName,
        status: entry.status,
        reason: entry.reason,
        timestamp: entry.timestamp
      })),
      recentWorkflowFailures: workflowTelemetryService.failures(10).map((entry) => ({
        tenantId: entry.tenantId,
        workflowId: entry.workflowId,
        workflowType: entry.workflowType,
        errorCode: entry.errorCode,
        timestamp: entry.timestamp
      })),
      recentAgenticRuns: agenticTelemetryService.recent(10).map((run) => ({
        planId: run.planId,
        goalType: run.goalType,
        workflowsSelected: run.workflowsSelected,
        success: run.success,
        timestamp: run.timestamp
      })),
      topAgenticGoalTypes: agenticTelemetryService.topGoalTypes(5)
    };
  }

  private countByStatus(tenants: Tenant[], status: Tenant["licenseStatus"]): number {
    return tenants.filter((tenant) => tenant.licenseStatus === status).length;
  }
}
