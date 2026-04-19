import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../../config/env.js";

export type EmployeeRole = "employee" | "manager" | "admin" | "readonly";

export interface EmployeeSessionClaims {
  userId: string;
  tenantId: string;
  role: EmployeeRole;
  employeeCode?: string;
  department?: string | null;
  roleName?: string | null;
  expiresAt: number;
}

function base64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", env.licenseSecret).update(payload).digest("base64url");
}

export class EmployeeSessionService {
  issueSession(input: Omit<EmployeeSessionClaims, "expiresAt">, ttlSeconds = 8 * 60 * 60): string {
    const payload = base64Url(JSON.stringify({ ...input, expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds }));
    return `employee.${payload}.${sign(payload)}`;
  }

  verifySession(token: string): EmployeeSessionClaims | null {
    const [prefix, payload, signature] = token.split(".");
    if (prefix !== "employee" || !payload || !signature) return null;
    const expected = sign(payload);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
      return null;
    }

    const claims = JSON.parse(fromBase64Url(payload)) as EmployeeSessionClaims;
    if (!claims.userId || !claims.tenantId || !claims.role || claims.expiresAt < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return claims;
  }
}

export const employeeSessionService = new EmployeeSessionService();
