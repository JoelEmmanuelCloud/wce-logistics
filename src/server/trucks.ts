import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { lagosToday } from "@/lib/dates";
import { recordAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import type { Truck, TruckDocument, TruckPhoto } from "@/server/db/schema";

export const REQUIRED_TRUCK_DOCUMENTS: TruckDocument["type"][] = ["vehicle_registration", "proof_of_ownership", "roadworthiness", "insurance"];
export const MIN_TRUCK_PHOTOS = 2;
export const MAX_TRUCK_PHOTOS = 8;

export const TRUCK_DOCUMENT_TITLES: Record<TruckDocument["type"], string> = {
  vehicle_registration: "Vehicle registration",
  proof_of_ownership: "Proof of ownership or lease",
  vehicle_licence: "Vehicle licence",
  roadworthiness: "Roadworthiness certificate",
  insurance: "Insurance certificate",
  other_permit: "Other permit",
};

export const DETAILS_EDITABLE_STATUSES: Truck["listingStatus"][] = ["draft", "active", "unavailable", "expired_documentation"];
export const DOCUMENTS_EDITABLE_STATUSES: Truck["listingStatus"][] = ["draft", "active", "unavailable", "expired_documentation", "pending_verification"];

export function todayIso(): string {
  return lagosToday();
}

export function latestTruckDocuments(documents: TruckDocument[]): Map<TruckDocument["type"], TruckDocument> {
  const latest = new Map<TruckDocument["type"], TruckDocument>();
  for (const document of [...documents].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())) {
    if (!latest.has(document.type)) {
      latest.set(document.type, document);
    }
  }
  return latest;
}

export function documentIsCurrent(document: TruckDocument | undefined, today = todayIso()): boolean {
  return Boolean(document && document.status !== "rejected" && (!document.expiryDate || document.expiryDate > today));
}

export type TruckCheck = { key: string; label: string; done: boolean };

export function truckSubmissionChecks(documents: TruckDocument[], photos: TruckPhoto[]): TruckCheck[] {
  const latest = latestTruckDocuments(documents);
  const today = todayIso();
  return [
    { key: "details", label: "Truck details completed", done: true },
    ...REQUIRED_TRUCK_DOCUMENTS.map((type) => ({
      key: `document:${type}`,
      label: `${TRUCK_DOCUMENT_TITLES[type]} uploaded and current`,
      done: documentIsCurrent(latest.get(type), today),
    })),
    { key: "photos", label: `At least ${MIN_TRUCK_PHOTOS} photos of the truck`, done: photos.length >= MIN_TRUCK_PHOTOS },
  ];
}

export function requiredDocumentsApproved(documents: TruckDocument[], today = todayIso()): boolean {
  const latest = latestTruckDocuments(documents);
  return REQUIRED_TRUCK_DOCUMENTS.every((type) => {
    const document = latest.get(type);
    return document?.status === "approved" && documentIsCurrent(document, today);
  });
}

export async function listTrucksForVendor(vendorId: string): Promise<Truck[]> {
  return db()
    .select()
    .from(schema.trucks)
    .where(and(eq(schema.trucks.vendorId, vendorId), isNull(schema.trucks.archivedAt)))
    .orderBy(desc(schema.trucks.createdAt));
}

export async function findVendorTruck(vendorId: string, truckId: string): Promise<Truck | null> {
  const [truck] = await db()
    .select()
    .from(schema.trucks)
    .where(and(eq(schema.trucks.id, truckId), eq(schema.trucks.vendorId, vendorId), isNull(schema.trucks.archivedAt)))
    .limit(1);
  return truck ?? null;
}

export async function listTruckDocuments(truckId: string): Promise<TruckDocument[]> {
  return db().select().from(schema.truckDocuments).where(eq(schema.truckDocuments.truckId, truckId)).orderBy(desc(schema.truckDocuments.uploadedAt));
}

export async function listTruckPhotos(truckId: string): Promise<TruckPhoto[]> {
  return db().select().from(schema.truckPhotos).where(eq(schema.truckPhotos.truckId, truckId)).orderBy(asc(schema.truckPhotos.uploadedAt));
}

export async function photoCounts(truckIds: string[]): Promise<Map<string, number>> {
  if (truckIds.length === 0) {
    return new Map();
  }
  const rows = await db()
    .select({ truckId: schema.truckPhotos.truckId })
    .from(schema.truckPhotos)
    .where(inArray(schema.truckPhotos.truckId, truckIds));
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.truckId, (counts.get(row.truckId) ?? 0) + 1);
  }
  return counts;
}

export async function flagTrucksWithExpiredDocuments(): Promise<Array<{ id: string; vendorId: string; registrationNumber: string }>> {
  const required = sql.join(
    REQUIRED_TRUCK_DOCUMENTS.map((type) => sql`${type}`),
    sql`, `,
  );
  return db().transaction(async (tx) => {
    const rows = await tx.execute<{ id: string; vendor_id: string; registration_number: string; previous: string }>(sql`
      update trucks t
      set listing_status = 'expired_documentation', updated_at = now()
      from (select id, listing_status from trucks where listing_status in ('active', 'unavailable') and archived_at is null for update) previous
      where t.id = previous.id
        and exists (
          select 1
          from unnest(array[${required}]::truck_document_type[]) as required(type)
          left join lateral (
            select d.status, d.expiry_date
            from truck_documents d
            where d.truck_id = t.id and d.type = required.type
            order by d.uploaded_at desc
            limit 1
          ) latest on true
          where latest.status is null
             or latest.status = 'rejected'
             or (latest.expiry_date is not null and latest.expiry_date <= (now() at time zone 'Africa/Lagos')::date)
        )
      returning t.id, t.vendor_id, t.registration_number, previous.listing_status as previous`);
    for (const row of rows) {
      await recordAudit({ actorId: null, action: "truck.documents_expired", entityType: "truck", entityId: row.id, metadata: { previousStatus: row.previous } }, tx);
    }
    return rows.map((row) => ({ id: row.id, vendorId: row.vendor_id, registrationNumber: row.registration_number }));
  });
}
