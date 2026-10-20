import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/server/db";
import type { VendorDocument, VendorProfile } from "@/server/db/schema";

export const EDITABLE_VENDOR_STATUSES = ["draft", "info_required", "rejected"] as const;

export function vendorIsEditable(profile: Pick<VendorProfile, "verificationStatus">): boolean {
  return (EDITABLE_VENDOR_STATUSES as readonly string[]).includes(profile.verificationStatus);
}

export function requiredVendorDocuments(category: VendorProfile["category"]): VendorDocument["type"][] {
  if (category === "logistics_company") {
    return ["government_id", "cac_certificate"];
  }
  if (category === "fleet_operator") {
    return ["government_id", "operating_authority"];
  }
  return ["government_id"];
}

export function latestDocumentsByType(documents: VendorDocument[]): Map<VendorDocument["type"], VendorDocument> {
  const latest = new Map<VendorDocument["type"], VendorDocument>();
  for (const document of [...documents].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())) {
    if (!latest.has(document.type)) {
      latest.set(document.type, document);
    }
  }
  return latest;
}

export type SubmissionCheck = { key: string; label: string; done: boolean };

export function vendorSubmissionChecks(profile: VendorProfile, documents: VendorDocument[]): SubmissionCheck[] {
  const latest = latestDocumentsByType(documents);
  const checks: SubmissionCheck[] = [
    { key: "profile", label: "Business profile completed", done: true },
    {
      key: "identity",
      label: "Identity document details provided",
      done: Boolean(profile.idDocumentType && profile.idDocumentReferenceEncrypted),
    },
  ];
  if (profile.category === "logistics_company") {
    checks.push({ key: "cac", label: "CAC registration number provided", done: Boolean(profile.cacNumber) });
  }
  for (const type of requiredVendorDocuments(profile.category)) {
    const document = latest.get(type);
    checks.push({
      key: `document:${type}`,
      label: `${DOCUMENT_TITLES[type]} uploaded`,
      done: Boolean(document && document.status !== "rejected"),
    });
  }
  return checks;
}

export const DOCUMENT_TITLES: Record<VendorDocument["type"], string> = {
  government_id: "Government-issued ID",
  cac_certificate: "CAC certificate",
  proof_of_address: "Proof of business address",
  operating_authority: "Operating authority letter",
};

export async function findVendorProfileByUser(userId: string): Promise<VendorProfile | null> {
  const [profile] = await db().select().from(schema.vendorProfiles).where(eq(schema.vendorProfiles.userId, userId)).limit(1);
  return profile ?? null;
}

export async function listVendorDocuments(vendorId: string): Promise<VendorDocument[]> {
  return db()
    .select()
    .from(schema.vendorDocuments)
    .where(eq(schema.vendorDocuments.vendorId, vendorId))
    .orderBy(desc(schema.vendorDocuments.uploadedAt));
}

export async function countVendorTrucks(vendorId: string): Promise<{ total: number; active: number }> {
  const rows = await db()
    .select({ status: schema.trucks.listingStatus, value: count() })
    .from(schema.trucks)
    .where(and(eq(schema.trucks.vendorId, vendorId), isNull(schema.trucks.archivedAt)))
    .groupBy(schema.trucks.listingStatus);
  return {
    total: rows.reduce((sum, row) => sum + row.value, 0),
    active: rows.find((row) => row.status === "active")?.value ?? 0,
  };
}
