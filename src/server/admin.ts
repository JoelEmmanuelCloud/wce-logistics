import "server-only";
import { and, count, desc, eq, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/server/db";
import type { User } from "@/server/db/schema";

export const PAGE_SIZE = 25;

export type Page<T> = { rows: T[]; total: number; page: number; pageCount: number };

function pageOf<T>(rows: T[], total: number, page: number): Page<T> {
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export const VENDOR_FILTERS = {
  awaiting: { label: "Awaiting review", statuses: ["submitted", "under_review"] },
  info_required: { label: "Information required", statuses: ["info_required"] },
  verified: { label: "Verified", statuses: ["verified"] },
  rejected: { label: "Rejected", statuses: ["rejected"] },
  suspended: { label: "Suspended", statuses: ["suspended"] },
  draft: { label: "Not submitted", statuses: ["draft"] },
  all: { label: "All", statuses: [] },
} as const satisfies Record<string, { label: string; statuses: readonly (typeof schema.verificationStatus.enumValues)[number][] }>;

export type VendorFilter = keyof typeof VENDOR_FILTERS;

export const TRUCK_FILTERS = {
  awaiting: { label: "Awaiting review", statuses: ["pending_verification"] },
  active: { label: "Active", statuses: ["active", "unavailable"] },
  expired: { label: "Documents expired", statuses: ["expired_documentation"] },
  suspended: { label: "Suspended", statuses: ["suspended"] },
  draft: { label: "Draft", statuses: ["draft"] },
  all: { label: "All", statuses: [] },
} as const satisfies Record<string, { label: string; statuses: readonly (typeof schema.truckListingStatus.enumValues)[number][] }>;

export type TruckFilter = keyof typeof TRUCK_FILTERS;

export async function adminStats() {
  const database = db();
  const [vendorRows, truckRows, expiring, bookingRows] = await Promise.all([
    database.select({ status: schema.vendorProfiles.verificationStatus, value: count() }).from(schema.vendorProfiles).groupBy(schema.vendorProfiles.verificationStatus),
    database
      .select({ status: schema.trucks.listingStatus, value: count() })
      .from(schema.trucks)
      .where(isNull(schema.trucks.archivedAt))
      .groupBy(schema.trucks.listingStatus),
    database
      .select({ value: count() })
      .from(schema.truckDocuments)
      .innerJoin(schema.trucks, eq(schema.trucks.id, schema.truckDocuments.truckId))
      .where(
        and(
          isNull(schema.trucks.archivedAt),
          inArray(schema.trucks.listingStatus, ["active", "unavailable"]),
          lte(schema.truckDocuments.expiryDate, sql`current_date + 30`),
          sql`${schema.truckDocuments.expiryDate} > current_date`,
        ),
      ),
    database
      .select({ status: schema.bookings.status, value: count() })
      .from(schema.bookings)
      .where(inArray(schema.bookings.status, ["pending_vendor_acceptance", "awaiting_payment", "confirmed"]))
      .groupBy(schema.bookings.status),
  ]);
  const bookings = Object.fromEntries(bookingRows.map((row) => [row.status, row.value])) as Record<string, number>;
  const vendors = Object.fromEntries(vendorRows.map((row) => [row.status, row.value])) as Record<string, number>;
  const trucks = Object.fromEntries(truckRows.map((row) => [row.status, row.value])) as Record<string, number>;
  return {
    vendorsAwaiting: (vendors.submitted ?? 0) + (vendors.under_review ?? 0),
    vendorsVerified: vendors.verified ?? 0,
    vendorsSuspended: vendors.suspended ?? 0,
    trucksAwaiting: trucks.pending_verification ?? 0,
    trucksActive: (trucks.active ?? 0) + (trucks.unavailable ?? 0),
    trucksExpired: trucks.expired_documentation ?? 0,
    documentsExpiringSoon: expiring[0]?.value ?? 0,
    bookingsAwaitingPayment: bookings.awaiting_payment ?? 0,
    bookingsAwaitingVendor: bookings.pending_vendor_acceptance ?? 0,
    bookingsConfirmed: bookings.confirmed ?? 0,
  };
}

export async function listVendorsForAdmin({ filter, query, page }: { filter: VendorFilter; query: string; page: number }) {
  const conditions: SQL[] = [];
  const statuses = VENDOR_FILTERS[filter].statuses;
  if (statuses.length > 0) {
    conditions.push(inArray(schema.vendorProfiles.verificationStatus, [...statuses]));
  }
  if (query) {
    const pattern = `%${escapeLike(query)}%`;
    conditions.push(
      or(
        ilike(schema.vendorProfiles.legalName, pattern),
        ilike(schema.vendorProfiles.businessName, pattern),
        ilike(schema.users.phone, pattern),
        ilike(schema.vendorProfiles.cacNumber, pattern),
      ) as SQL,
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const database = db();
  const [rows, totals] = await Promise.all([
    database
      .select({ vendor: schema.vendorProfiles, phone: schema.users.phone })
      .from(schema.vendorProfiles)
      .innerJoin(schema.users, eq(schema.users.id, schema.vendorProfiles.userId))
      .where(where)
      .orderBy(sql`${schema.vendorProfiles.submittedAt} desc nulls last`, desc(schema.vendorProfiles.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    database
      .select({ value: count() })
      .from(schema.vendorProfiles)
      .innerJoin(schema.users, eq(schema.users.id, schema.vendorProfiles.userId))
      .where(where),
  ]);
  return pageOf(rows, totals[0]?.value ?? 0, page);
}

export async function getVendorForAdmin(vendorId: string) {
  const database = db();
  const [row] = await database
    .select({ vendor: schema.vendorProfiles, user: schema.users })
    .from(schema.vendorProfiles)
    .innerJoin(schema.users, eq(schema.users.id, schema.vendorProfiles.userId))
    .where(eq(schema.vendorProfiles.id, vendorId))
    .limit(1);
  if (!row) {
    return null;
  }
  const [documents, trucks] = await Promise.all([
    database.select().from(schema.vendorDocuments).where(eq(schema.vendorDocuments.vendorId, vendorId)).orderBy(desc(schema.vendorDocuments.uploadedAt)),
    database
      .select()
      .from(schema.trucks)
      .where(and(eq(schema.trucks.vendorId, vendorId), isNull(schema.trucks.archivedAt)))
      .orderBy(desc(schema.trucks.createdAt)),
  ]);
  return { ...row, documents, trucks };
}

export async function listTrucksForAdmin({ filter, query, page }: { filter: TruckFilter; query: string; page: number }) {
  const conditions: SQL[] = [isNull(schema.trucks.archivedAt)];
  const statuses = TRUCK_FILTERS[filter].statuses;
  if (statuses.length > 0) {
    conditions.push(inArray(schema.trucks.listingStatus, [...statuses]));
  }
  if (query) {
    const pattern = `%${escapeLike(query)}%`;
    conditions.push(
      or(
        ilike(schema.trucks.registrationNumber, pattern),
        ilike(schema.trucks.registrationNormalized, `%${escapeLike(query.toUpperCase().replace(/[^A-Z0-9]/g, ""))}%`),
        ilike(schema.vendorProfiles.legalName, pattern),
        ilike(schema.vendorProfiles.businessName, pattern),
      ) as SQL,
    );
  }
  const where = and(...conditions);
  const database = db();
  const [rows, totals] = await Promise.all([
    database
      .select({ truck: schema.trucks, vendorName: sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`, vendorStatus: schema.vendorProfiles.verificationStatus })
      .from(schema.trucks)
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.trucks.vendorId))
      .where(where)
      .orderBy(sql`${schema.trucks.submittedAt} desc nulls last`, desc(schema.trucks.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    database
      .select({ value: count() })
      .from(schema.trucks)
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.trucks.vendorId))
      .where(where),
  ]);
  return pageOf(rows, totals[0]?.value ?? 0, page);
}

export async function getTruckForAdmin(truckId: string) {
  const database = db();
  const [row] = await database
    .select({ truck: schema.trucks, vendor: schema.vendorProfiles })
    .from(schema.trucks)
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.trucks.vendorId))
    .where(eq(schema.trucks.id, truckId))
    .limit(1);
  if (!row) {
    return null;
  }
  const [documents, photos] = await Promise.all([
    database.select().from(schema.truckDocuments).where(eq(schema.truckDocuments.truckId, truckId)).orderBy(desc(schema.truckDocuments.uploadedAt)),
    database.select().from(schema.truckPhotos).where(eq(schema.truckPhotos.truckId, truckId)).orderBy(schema.truckPhotos.uploadedAt),
  ]);
  return { ...row, documents, photos };
}

export async function listUsersForAdmin({ role, query, page }: { role: User["role"] | "all"; query: string; page: number }) {
  const conditions: SQL[] = [];
  if (role !== "all") {
    conditions.push(role === null ? isNull(schema.users.role) : eq(schema.users.role, role));
  }
  if (query) {
    const pattern = `%${escapeLike(query)}%`;
    conditions.push(or(ilike(schema.users.fullName, pattern), ilike(schema.users.phone, pattern), ilike(schema.users.email, pattern)) as SQL);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const database = db();
  const [rows, totals] = await Promise.all([
    database.select().from(schema.users).where(where).orderBy(desc(schema.users.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    database.select({ value: count() }).from(schema.users).where(where),
  ]);
  return pageOf(rows, totals[0]?.value ?? 0, page);
}

const actors = alias(schema.users, "actors");

export async function listAuditLogs({ page, entityId }: { page: number; entityId?: string }) {
  const where = entityId ? or(eq(schema.auditLogs.entityId, entityId), sql`${schema.auditLogs.metadata} ->> 'truckId' = ${entityId}`, sql`${schema.auditLogs.metadata} ->> 'vendorId' = ${entityId}`) : undefined;
  const database = db();
  const [rows, totals] = await Promise.all([
    database
      .select({ log: schema.auditLogs, actorName: actors.fullName, actorPhone: actors.phone, actorRole: actors.role })
      .from(schema.auditLogs)
      .leftJoin(actors, eq(actors.id, schema.auditLogs.actorId))
      .where(where)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    database.select({ value: count() }).from(schema.auditLogs).where(where),
  ]);
  return pageOf(rows, totals[0]?.value ?? 0, page);
}

export function parsePage(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseQuery(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 80) ?? "";
}
