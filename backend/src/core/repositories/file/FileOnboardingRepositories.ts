import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OnboardingPath, RoleProfile } from "../../models/onboardingModels.js";
import type { OnboardingPathRepository, RoleProfileRepository } from "../interfaces.js";

async function ensureFile(filePath: string, defaultContents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, defaultContents, "utf8");
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  await ensureFile(filePath, JSON.stringify(fallback, null, 2));
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  await ensureFile(filePath, JSON.stringify(value, null, 2));
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

export class FileRoleProfileRepository implements RoleProfileRepository {
  constructor(private readonly filePath: string) {}

  async create(roleProfile: RoleProfile): Promise<RoleProfile> {
    const current = await readJsonFile<RoleProfile[]>(this.filePath, []);
    const next = [...current.filter((item) => item.id !== roleProfile.id), roleProfile];
    await writeJsonFile(this.filePath, next);
    return roleProfile;
  }

  async getById(tenantId: string, roleId: string): Promise<RoleProfile | null> {
    const current = await readJsonFile<RoleProfile[]>(this.filePath, []);
    return current.find((item) => item.id === roleId && item.tenantId === tenantId) ?? null;
  }

  async listByTenant(tenantId: string): Promise<RoleProfile[]> {
    const current = await readJsonFile<RoleProfile[]>(this.filePath, []);
    return current.filter((item) => item.tenantId === tenantId);
  }
}

export class FileOnboardingPathRepository implements OnboardingPathRepository {
  constructor(private readonly filePath: string) {}

  async create(pathRecord: OnboardingPath): Promise<OnboardingPath> {
    const current = await readJsonFile<OnboardingPath[]>(this.filePath, []);
    const next = [...current.filter((item) => item.id !== pathRecord.id), pathRecord];
    await writeJsonFile(this.filePath, next);
    return pathRecord;
  }

  async getById(tenantId: string, pathId: string): Promise<OnboardingPath | null> {
    const current = await readJsonFile<OnboardingPath[]>(this.filePath, []);
    return current.find((item) => item.id === pathId && item.tenantId === tenantId) ?? null;
  }

  async listByTenant(tenantId: string): Promise<OnboardingPath[]> {
    const current = await readJsonFile<OnboardingPath[]>(this.filePath, []);
    return current.filter((item) => item.tenantId === tenantId);
  }
}
