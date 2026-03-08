export type AppErrorCode =
  | "TENANT_NOT_FOUND"
  | "LICENSE_INACTIVE"
  | "LICENSE_EXPIRED"
  | "CONNECTOR_NOT_FOUND"
  | "CONNECTOR_CONFIG_NOT_FOUND"
  | "CONNECTOR_AUTH_FAILED"
  | "CONNECTOR_UNAVAILABLE"
  | "CLICKUP_RESOURCE_NOT_FOUND"
  | "CLICKUP_SYNC_FAILED"
  | "PROJECT_NOT_FOUND"
  | "WORKFLOW_EXECUTION_FAILED"
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly httpStatus: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}
