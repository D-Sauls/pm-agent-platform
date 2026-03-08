import { AppError } from "../core/errors/AppError.js";

export interface RetryPolicyOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class RetryPolicyService {
  async execute<T>(
    _operation: string,
    action: () => Promise<T>,
    options?: RetryPolicyOptions
  ): Promise<T> {
    const maxAttempts = Math.max(1, options?.maxAttempts ?? 2);
    const baseDelayMs = Math.max(0, options?.baseDelayMs ?? 150);
    const shouldRetry = options?.shouldRetry ?? this.defaultShouldRetry;

    let attempt = 0;
    let lastError: unknown;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        return await action();
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts || !shouldRetry(error)) {
          break;
        }
        await sleep(baseDelayMs * attempt);
      }
    }
    throw lastError;
  }

  private defaultShouldRetry(error: unknown): boolean {
    if (error instanceof AppError) {
      if (error.code === "CONNECTOR_AUTH_FAILED") {
        return false;
      }
      return (
        error.code === "CONNECTOR_UNAVAILABLE" ||
        error.code === "CLICKUP_SYNC_FAILED" ||
        error.code === "CONNECTOR_NOT_FOUND"
      );
    }
    if (!(error instanceof Error)) {
      return false;
    }
    return /(timed out|timeout|network|econnreset|ehostunreach|fetch failed)/i.test(error.message);
  }
}
