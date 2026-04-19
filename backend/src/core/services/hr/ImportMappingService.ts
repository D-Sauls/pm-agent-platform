import type { ColumnMapping, ProvisionedUser } from "../../models/hrImportModels.js";

const commonHeadings: Record<keyof ColumnMapping, string[]> = {
  employeeCode: ["employeecode", "employee code", "employee id", "staff code", "staff id"],
  firstName: ["firstname", "first name", "given name"],
  lastName: ["lastname", "last name", "surname", "family name"],
  workEmail: ["workemail", "work email", "email", "business email"],
  department: ["department", "dept", "division"],
  roleName: ["rolename", "role name", "role", "job title", "position"],
  managerEmail: ["manageremail", "manager email", "manager"],
  startDate: ["startdate", "start date", "hire date", "commencement date"],
  employmentType: ["employmenttype", "employment type", "worker type"],
  location: ["location", "site", "branch"],
  status: ["status", "employee status"]
};

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
}

export class ImportMappingService {
  inferMapping(headers: string[], configuredMapping?: ColumnMapping): ColumnMapping {
    const normalized = new Map(headers.map((header) => [normalizeHeader(header), header]));
    const inferred: ColumnMapping = {};
    for (const [field, candidates] of Object.entries(commonHeadings) as Array<[keyof ColumnMapping, string[]]>) {
      inferred[field] = candidates.map(normalizeHeader).map((candidate) => normalized.get(candidate)).find(Boolean);
    }
    return { ...inferred, ...configuredMapping };
  }

  mapRow(rawData: Record<string, unknown>, mapping: ColumnMapping): Partial<ProvisionedUser> {
    const get = (field: keyof ColumnMapping): string | null => {
      const source = mapping[field];
      if (!source) return null;
      const value = rawData[source];
      const normalized = String(value ?? "").trim();
      return normalized.length > 0 ? normalized : null;
    };

    return {
      employeeCode: get("employeeCode") ?? "",
      firstName: get("firstName") ?? "",
      lastName: get("lastName") ?? "",
      workEmail: get("workEmail"),
      department: get("department"),
      roleName: get("roleName"),
      managerEmail: get("managerEmail"),
      startDate: get("startDate") ? new Date(String(get("startDate"))) : null,
      employmentType: get("employmentType"),
      location: get("location")
    };
  }
}
