import type {
  ProvisionedUser,
  ProvisioningConfig,
  UserImportRow,
  ValidationStatus
} from "../../models/hrImportModels.js";
import type { FileHrImportRepository } from "./FileHrImportRepository.js";
import type { RoleProfileService } from "../onboarding/RoleProfileService.js";

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export class ImportValidationService {
  constructor(
    private readonly repository: FileHrImportRepository,
    private readonly roleProfileService: RoleProfileService
  ) {}

  async validateRows(
    tenantId: string,
    rows: UserImportRow[],
    config: ProvisioningConfig
  ): Promise<UserImportRow[]> {
    const seenEmployeeCodes = new Set<string>();
    const seenEmails = new Set<string>();

    return Promise.all(
      rows.map(async (row) => {
        const mapped = row.mappedData ?? {};
        const errors: string[] = [];
        const warnings: string[] = [];

        if (config.usernameMode === "employee_code" && !mapped.employeeCode) {
          errors.push("employeeCode is required when usernameMode is employee_code.");
        }
        if (config.usernameMode === "email" && !mapped.workEmail) {
          errors.push("workEmail is required when usernameMode is email.");
        }
        if (!mapped.firstName) errors.push("firstName is required.");
        if (!mapped.lastName) errors.push("lastName is required.");

        if (mapped.employeeCode) {
          const key = mapped.employeeCode.toLowerCase();
          if (seenEmployeeCodes.has(key)) {
            errors.push("Duplicate employeeCode in import file.");
          }
          seenEmployeeCodes.add(key);
          if (this.repository.findUserByEmployeeCode(tenantId, mapped.employeeCode)) {
            errors.push("employeeCode already exists for this tenant.");
          }
        }

        if (mapped.workEmail) {
          const email = mapped.workEmail.toLowerCase();
          if (!validEmail(email)) {
            errors.push("workEmail is malformed.");
          }
          if (seenEmails.has(email)) {
            const message = "Duplicate workEmail in import file.";
            config.duplicateEmailMode === "error" ? errors.push(message) : warnings.push(message);
          }
          seenEmails.add(email);
          if (this.repository.findUserByEmail(tenantId, email)) {
            const message = "workEmail already exists for this tenant.";
            config.duplicateEmailMode === "error" ? errors.push(message) : warnings.push(message);
          }
        }

        if (mapped.managerEmail && !validEmail(mapped.managerEmail)) {
          warnings.push("managerEmail is malformed.");
        }
        if (mapped.startDate && Number.isNaN(new Date(mapped.startDate).getTime())) {
          errors.push("startDate is malformed.");
        }
        if (mapped.roleName) {
          const role = await this.roleProfileService.findByRole(
            tenantId,
            mapped.roleName,
            mapped.department ?? undefined
          );
          if (!role) {
            const message = "No role mapping found for roleName/department.";
            config.missingRoleMappingMode === "error" ? errors.push(message) : warnings.push(message);
          }
        }

        const validationStatus: ValidationStatus =
          errors.length > 0 ? "invalid" : warnings.length > 0 ? "warning" : "valid";
        return {
          ...row,
          validationStatus,
          errorMessages: errors,
          warningMessages: warnings
        };
      })
    );
  }
}
