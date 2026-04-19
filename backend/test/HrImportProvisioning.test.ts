import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";
import { createApp } from "../src/app.js";
import {
  onboardingPathServiceV2,
  roleProfileServiceV2,
  userImportServiceV2
} from "../src/core/container.js";
import { SpreadsheetParserService } from "../src/core/services/hr/SpreadsheetParserService.js";
import { ImportMappingService } from "../src/core/services/hr/ImportMappingService.js";

async function loginAsLocalAdmin(base: string): Promise<string> {
  const response = await fetch(`${base}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@local.dev",
      password: "ChangeMe123!"
    })
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { token: string };
  return body.token;
}

function makeStoredZip(entries: Array<{ name: string; data: string }>): Buffer {
  const buffers: Buffer[] = [];
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = Buffer.from(entry.data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt32LE(0, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    buffers.push(header, name, data);
  }
  return Buffer.concat(buffers);
}

function makeSimpleXlsx(): Buffer {
  return makeStoredZip([
    {
      name: "xl/sharedStrings.xml",
      data:
        '<sst><si><t>Employee Code</t></si><si><t>First Name</t></si><si><t>Last Name</t></si><si><t>Email</t></si><si><t>E100</t></si><si><t>Ada</t></si><si><t>Lovelace</t></si><si><t>ada@example.com</t></si></sst>'
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data:
        '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c></row><row r="2"><c r="A2" t="s"><v>4</v></c><c r="B2" t="s"><v>5</v></c><c r="C2" t="s"><v>6</v></c><c r="D2" t="s"><v>7</v></c></row></sheetData></worksheet>'
    }
  ]);
}

test("HR spreadsheet parser handles csv and xlsx", () => {
  const parser = new SpreadsheetParserService();
  const csv = parser.parse(
    "csv",
    Buffer.from('Employee Code,First Name,Last Name,Email\nE100,"Ada",Lovelace,ada@example.com')
  );
  assert.deepEqual(csv.headers, ["Employee Code", "First Name", "Last Name", "Email"]);
  assert.equal(csv.rows[0]["First Name"], "Ada");

  const xlsx = parser.parse("xlsx", makeSimpleXlsx());
  assert.equal(xlsx.rows[0]["Employee Code"], "E100");
  assert.equal(xlsx.rows[0]["Email"], "ada@example.com");
});

test("HR column mapping infers common headings", () => {
  const mapper = new ImportMappingService();
  const mapping = mapper.inferMapping(["Employee Code", "First Name", "Surname", "Work Email"]);
  const row = mapper.mapRow(
    {
      "Employee Code": "E101",
      "First Name": "Grace",
      Surname: "Hopper",
      "Work Email": "grace@example.com"
    },
    mapping
  );
  assert.equal(row.employeeCode, "E101");
  assert.equal(row.lastName, "Hopper");
  assert.equal(row.workEmail, "grace@example.com");
});

test("HR import routes are admin protected and process valid rows safely", async () => {
  await roleProfileServiceV2.create({
    id: `role-hr-import-${Date.now()}`,
    tenantId: "tenant-acme",
    roleName: "Kitchen Trainer",
    department: "Kitchen",
    description: "Training role for HR import tests."
  }).catch(() => undefined);

  const roles = await roleProfileServiceV2.list("tenant-acme");
  const role = roles.find((item) => item.roleName === "Kitchen Trainer")!;
  await onboardingPathServiceV2.create({
    id: `path-hr-import-${Date.now()}`,
    tenantId: "tenant-acme",
    roleId: role.id,
    courseIds: ["course-security-awareness"],
    policyIds: ["policy-security-awareness"],
    estimatedDuration: 45,
    version: "v1"
  }).catch(() => undefined);

  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Failed to resolve test port");
    const base = `http://127.0.0.1:${address.port}`;

    const unauthorized = await fetch(`${base}/api/admin/hr-import/jobs?tenantId=tenant-acme`);
    assert.equal(unauthorized.status, 401);

    const token = await loginAsLocalAdmin(base);
    const suffix = Date.now();
    const csv = [
      "Employee Code,First Name,Last Name,Work Email,Department,Role Name,Manager Email,Start Date",
      `EMP-${suffix},Nia,Stone,nia${suffix}@example.com,Kitchen,Kitchen Trainer,manager@example.com,2026-05-01`,
      `EMP-${suffix},Duplicate,Stone,dup${suffix}@example.com,Kitchen,Kitchen Trainer,manager@example.com,2026-05-01`
    ].join("\n");

    const createResponse = await fetch(`${base}/api/admin/hr-import/jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tenantId: "tenant-acme",
        fileName: "hr-users.csv",
        fileContentBase64: Buffer.from(csv).toString("base64")
      })
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as any;
    assert.equal(created.job.status, "preview_ready");
    assert.equal(created.rows.length, 2);
    assert.equal(created.rows[0].validationStatus, "valid");
    assert.equal(created.rows[1].validationStatus, "invalid");

    const processResponse = await fetch(`${base}/api/admin/hr-import/jobs/${created.job.id}/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ tenantId: "tenant-acme" })
    });
    assert.equal(processResponse.status, 200);
    const processed = (await processResponse.json()) as any;
    assert.equal(processed.job.successfulRows, 1);
    assert.equal(processed.job.failedRows, 1);
    assert.equal(processed.provisionedUsers[0].accountStatus, "pending_activation");
    assert.equal(processed.assignmentOutcomes[0].assignedCourseIds.includes("course-security-awareness"), true);

    const jobs = userImportServiceV2.listJobs("tenant-acme");
    assert.ok(jobs.some((job) => job.id === created.job.id));
  } finally {
    server.close();
  }
});
