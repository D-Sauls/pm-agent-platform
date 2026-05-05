import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import type { DocumentStore } from "./JsonDocumentStore.js";

type WorkerRequest = {
  connectionString: string;
  ssl: boolean;
  operation: string;
  args: unknown[];
};

type WorkerResponse<T> =
  | { ok: true; value: T }
  | { ok: false; error: { message: string; code?: string } };

function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}

export class PostgresDocumentStore implements DocumentStore {
  private readonly workerPath = fileURLToPath(new URL("./PostgresDocumentStoreWorker.js", import.meta.url));
  private readonly workerTsPath = fileURLToPath(new URL("./PostgresDocumentStoreWorker.ts", import.meta.url));

  constructor(
    private readonly connectionString: string,
    private readonly ssl = env.databaseSsl
  ) {
    this.invoke("migrate", []);
  }

  upsert<T>(scope: string, tenantId: string, id: string, value: T): T {
    this.invoke("upsert", [scope, tenantId, id, value]);
    return value;
  }

  get<T>(scope: string, tenantId: string, id: string): T | null {
    return this.invoke<T | null>("get", [scope, tenantId, id]);
  }

  list<T>(scope: string, tenantId: string): T[] {
    return this.invoke<T[]>("list", [scope, tenantId]);
  }

  replaceScope<T extends { id: string }>(scope: string, tenantId: string, values: T[]): void {
    this.invoke("replaceScope", [scope, tenantId, values]);
  }

  append<T extends { id: string }>(scope: string, tenantId: string, id: string, value: T): T {
    this.invoke("append", [scope, tenantId, id, value]);
    return value;
  }

  listEvents<T>(scope: string, tenantId: string): T[] {
    return this.invoke<T[]>("listEvents", [scope, tenantId]);
  }

  checkReady(): boolean {
    return this.invoke<boolean>("checkReady", []);
  }

  close(): void {
    // Connections are opened per worker invocation so there is no long-lived pool to close here.
  }

  private invoke<T = unknown>(operation: string, args: unknown[]): T {
    const request: WorkerRequest = {
      connectionString: this.connectionString,
      ssl: this.ssl,
      operation,
      args
    };
    const workerArgs = fs.existsSync(this.workerPath)
      ? [this.workerPath]
      : ["--import", "tsx", this.workerTsPath];
    const result = spawnSync(process.execPath, workerArgs, {
      input: JSON.stringify(request),
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(result.stderr || `PostgreSQL document store worker failed with status ${result.status}`);
    }

    const response = JSON.parse(result.stdout, reviveDates) as WorkerResponse<T>;
    if (!response.ok) {
      const message = response.error.code === "23505"
        ? `UNIQUE constraint failed: ${operation}`
        : response.error.message;
      const error = new Error(message);
      (error as Error & { code?: string }).code = response.error.code;
      throw error;
    }
    return response.value;
  }
}