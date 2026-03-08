import { env } from "../config/env.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function scrub(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrub(item));
  }
  if (typeof value !== "object") {
    return value;
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(input)) {
    if (/(password|secret|token|api[_-]?key|authorization)/i.test(key)) {
      output[key] = "[REDACTED]";
      continue;
    }
    output[key] = scrub(raw);
  }
  return output;
}

export class LoggingService {
  constructor(private readonly minLevel: LogLevel = env.logLevel) {}

  log(level: LogLevel, event: string, metadata?: Record<string, unknown>): void {
    if (ORDER[level] < ORDER[this.minLevel]) {
      return;
    }

    const payload = {
      ts: new Date().toISOString(),
      level,
      event,
      env: env.nodeEnv,
      ...(metadata ? (scrub(metadata) as Record<string, unknown>) : {})
    };
    const line = JSON.stringify(payload);
    if (level === "error") {
      console.error(line);
      return;
    }
    if (level === "warn") {
      console.warn(line);
      return;
    }
    console.log(line);
  }

  debug(event: string, metadata?: Record<string, unknown>): void {
    this.log("debug", event, metadata);
  }

  info(event: string, metadata?: Record<string, unknown>): void {
    this.log("info", event, metadata);
  }

  warn(event: string, metadata?: Record<string, unknown>): void {
    this.log("warn", event, metadata);
  }

  error(event: string, metadata?: Record<string, unknown>): void {
    this.log("error", event, metadata);
  }
}
