import assert from "node:assert/strict";
import test from "node:test";
import { MemoryTimeEntryRepository } from "../src/core/repositories/memory/MemoryRepositories.js";
import { BillingClassificationService } from "../src/core/services/time/BillingClassificationService.js";
import { TimeEntryService } from "../src/core/services/time/TimeEntryService.js";

test("TimeEntryService validates and ingests entries", async () => {
  const service = new TimeEntryService(
    new MemoryTimeEntryRepository(),
    new BillingClassificationService()
  );
  const result = await service.ingest([
    {
      timeEntryId: "te-1",
      tenantId: "tenant-test",
      projectId: "project-test",
      sourceSystem: "manual",
      entryDate: "2026-03-01",
      hours: 3,
      billingCategory: "client delivery"
    }
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].billableStatus, "billable");
});

test("TimeEntryService rejects invalid hours", async () => {
  const service = new TimeEntryService(
    new MemoryTimeEntryRepository(),
    new BillingClassificationService()
  );

  await assert.rejects(async () => {
    await service.ingest([
      {
        timeEntryId: "te-2",
        tenantId: "tenant-test",
        projectId: "project-test",
        sourceSystem: "manual",
        entryDate: "2026-03-01",
        hours: 30
      }
    ]);
  });
});
