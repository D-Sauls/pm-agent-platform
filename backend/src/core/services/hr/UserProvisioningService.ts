import { createHash, randomBytes, randomUUID, scryptSync } from "node:crypto";
import type {
  ActivationRecord,
  ProvisionedUser,
  ProvisioningConfig,
  UserImportRow
} from "../../models/hrImportModels.js";
import type { FileHrImportRepository } from "./FileHrImportRepository.js";
import { employeeSessionService } from "../auth/EmployeeSessionService.js";

function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(secret, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class UserProvisioningService {
  constructor(private readonly repository: FileHrImportRepository) {}

  provision(tenantId: string, row: UserImportRow, config: ProvisioningConfig): {
    user: ProvisionedUser;
    activationRecord: ActivationRecord;
    oneTimeSecret?: string;
  } {
    if (row.validationStatus === "invalid") {
      throw new Error("Invalid import rows cannot be provisioned.");
    }
    const mapped = row.mappedData;
    if (!mapped?.employeeCode || !mapped.firstName || !mapped.lastName) {
      throw new Error("Mapped employeeCode, firstName, and lastName are required.");
    }
    if (this.repository.findUserByEmployeeCode(tenantId, mapped.employeeCode)) {
      throw new Error("employeeCode already exists for this tenant.");
    }

    const now = new Date();
    const username =
      config.usernameMode === "email" && mapped.workEmail ? mapped.workEmail.toLowerCase() : mapped.employeeCode;
    const user: ProvisionedUser = {
      id: randomUUID(),
      tenantId,
      employeeCode: mapped.employeeCode,
      username,
      firstName: mapped.firstName,
      lastName: mapped.lastName,
      workEmail: mapped.workEmail?.toLowerCase() ?? null,
      department: mapped.department ?? null,
      roleName: mapped.roleName ?? null,
      managerEmail: mapped.managerEmail?.toLowerCase() ?? null,
      startDate: mapped.startDate ? new Date(mapped.startDate) : null,
      employmentType: mapped.employmentType ?? null,
      location: mapped.location ?? null,
      accountStatus: config.activationMode === "activation_link" ? "pending_activation" : "pending_activation",
      passwordHash: null,
      createdAt: now,
      updatedAt: now
    };
    this.repository.createUser(user);

    const expiresAt = new Date(now.getTime() + config.activationTtlHours * 60 * 60 * 1000);
    const oneTimeSecret = randomBytes(24).toString("base64url");
    const activationRecord: ActivationRecord = {
      id: randomUUID(),
      tenantId,
      userId: user.id,
      activationMode: config.activationMode,
      activationTokenHash: config.activationMode === "activation_link" ? hashToken(oneTimeSecret) : null,
      tempPasswordHash: config.activationMode === "temporary_password" ? hashSecret(oneTimeSecret) : null,
      expiresAt,
      activatedAt: null,
      createdAt: now
    };
    this.repository.createActivationRecord(activationRecord);

    return { user, activationRecord, oneTimeSecret };
  }

  resendActivation(tenantId: string, userId: string, config: ProvisioningConfig): ActivationRecord {
    const existingUser = this.repository.listUsers(tenantId).find((user) => user.id === userId);
    if (!existingUser) {
      throw new Error(`User ${userId} not found`);
    }
    const now = new Date();
    const token = randomBytes(24).toString("base64url");
    return this.repository.createActivationRecord({
      id: randomUUID(),
      tenantId,
      userId,
      activationMode: config.activationMode,
      activationTokenHash: config.activationMode === "activation_link" ? hashToken(token) : null,
      tempPasswordHash: config.activationMode === "temporary_password" ? hashSecret(token) : null,
      expiresAt: new Date(now.getTime() + config.activationTtlHours * 60 * 60 * 1000),
      activatedAt: null,
      createdAt: now
    });
  }

  completeActivation(input: {
    token: string;
    password: string;
    tenantId?: string;
  }): { user: ProvisionedUser; sessionToken: string } {
    const tokenHash = hashToken(input.token);
    const record = this.repository.findActivationRecordByTokenHash(tokenHash);
    if (!record || (input.tenantId && record.tenantId !== input.tenantId)) {
      throw new Error("Invalid activation token.");
    }
    if (record.activatedAt) {
      throw new Error("Activation token has already been used.");
    }
    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      throw new Error("Activation token has expired.");
    }
    const user = this.repository.listUsers(record.tenantId).find((candidate) => candidate.id === record.userId);
    if (!user) {
      throw new Error("Activation user not found.");
    }
    if (input.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const updatedUser: ProvisionedUser = {
      ...user,
      accountStatus: "active",
      passwordHash: hashSecret(input.password),
      updatedAt: new Date()
    };
    this.repository.updateUser(updatedUser);
    this.repository.updateActivationRecord({
      ...record,
      activatedAt: new Date()
    });

    return {
      user: updatedUser,
      sessionToken: employeeSessionService.issueSession({
        userId: updatedUser.id,
        tenantId: updatedUser.tenantId,
        role: "employee",
        employeeCode: updatedUser.employeeCode,
        department: updatedUser.department,
        roleName: updatedUser.roleName
      })
    };
  }
}
