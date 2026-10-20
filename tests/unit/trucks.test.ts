import { describe, expect, it } from "vitest";
import type { TruckDocument, TruckPhoto } from "@/server/db/schema";
import { documentIsCurrent, latestTruckDocuments, requiredDocumentsApproved, truckSubmissionChecks } from "@/server/trucks";

let sequence = 0;

function doc(type: TruckDocument["type"], overrides: Partial<TruckDocument> = {}): TruckDocument {
  sequence += 1;
  return {
    id: `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    truckId: "truck",
    type,
    storageKey: "key",
    fileName: "file.pdf",
    contentType: "application/pdf",
    sizeBytes: 100,
    issueDate: null,
    expiryDate: null,
    status: "pending",
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
    uploadedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, sequence)),
    ...overrides,
  };
}

const photo: TruckPhoto = { id: "p", truckId: "truck", storageKey: "k", contentType: "image/png", sizeBytes: 1, uploadedAt: new Date() };

describe("truck document rules", () => {
  it("uses the most recent upload for each type", () => {
    const older = doc("insurance", { status: "rejected" });
    const newer = doc("insurance");
    expect(latestTruckDocuments([newer, older]).get("insurance")?.id).toBe(newer.id);
  });

  it("treats expired or rejected documents as not current", () => {
    expect(documentIsCurrent(doc("insurance", { expiryDate: "2026-01-01" }), "2026-06-01")).toBe(false);
    expect(documentIsCurrent(doc("insurance", { expiryDate: "2026-06-01" }), "2026-06-01")).toBe(false);
    expect(documentIsCurrent(doc("insurance", { expiryDate: "2026-06-02" }), "2026-06-01")).toBe(true);
    expect(documentIsCurrent(doc("insurance", { status: "rejected" }), "2026-06-01")).toBe(false);
    expect(documentIsCurrent(undefined)).toBe(false);
  });

  it("requires every required document and two photos before submission", () => {
    const documents = [
      doc("vehicle_registration"),
      doc("proof_of_ownership"),
      doc("roadworthiness", { expiryDate: "2999-01-01" }),
      doc("insurance", { expiryDate: "2999-01-01" }),
    ];
    expect(truckSubmissionChecks(documents, [photo, photo]).every((check) => check.done)).toBe(true);
    expect(truckSubmissionChecks(documents, [photo]).find((check) => check.key === "photos")?.done).toBe(false);
    expect(truckSubmissionChecks(documents.slice(1), [photo, photo]).find((check) => check.key === "document:vehicle_registration")?.done).toBe(false);
  });

  it("only treats approved, current documents as approved", () => {
    const approved = (type: TruckDocument["type"], expiryDate: string | null = null) => doc(type, { status: "approved", expiryDate });
    const complete = [
      approved("vehicle_registration"),
      approved("proof_of_ownership"),
      approved("roadworthiness", "2999-01-01"),
      approved("insurance", "2999-01-01"),
    ];
    expect(requiredDocumentsApproved(complete, "2026-06-01")).toBe(true);
    expect(requiredDocumentsApproved([...complete, doc("insurance", { expiryDate: "2999-01-01" })], "2026-06-01")).toBe(false);
    expect(requiredDocumentsApproved([...complete.slice(0, 3), approved("insurance", "2026-01-01")], "2026-06-01")).toBe(false);
  });
});
