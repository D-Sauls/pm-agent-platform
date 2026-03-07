export type AppErrorCode =
  | "TENANT_NOT_FOUND"
  | "LICENSE_INACTIVE"
  | "LICENSE_EXPIRED"
  | "CONNECTOR_NOT_FOUND"
  | "CONNECTOR_UNAVAILABLE"
  | "PROJECT_NOT_FOUND"
  | "WORKFLOW_EXECUTION_FAILED"
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR";

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
