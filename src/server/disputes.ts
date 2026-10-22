import "server-only";
import { and, asc, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { withinDisputeWindow } from "@/lib/delivery";
import { recordAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import type { Booking, Dispute, DisputeStatus, UserRole } from "@/server/db/schema";
import type { StoredFile } from "@/server/storage";

export class DisputeError extends Error {}

export const ACTIVE_DISPUTE_STATUSES: DisputeStatus[] = ["open", "under_review", "awaiting_information"];

export type DisputeActor = { id: string; role: "customer" } | { id: string; role: "vendor"; vendorId: string } | { id: string; role: "admin" };

function partyOf(actor: DisputeActor, booking: Booking): boolean {
  return actor.role === "admin" || (actor.role === "customer" && booking.customerId === actor.id) || (actor.role === "vendor" && booking.vendorId === actor.vendorId);
}

export async function openDispute(
  actor: Exclude<DisputeActor, { role: "admin" }>,
  bookingId: string,
  input: { category: string; description: string },
  attachment: StoredFile | null,
): Promise<{ dispute: Dispute; booking: Booking }> {
  return db().transaction(async (tx) => {
    const [booking] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).limit(1).for("update");
    if (!booking || !partyOf(actor, booking)) {
      throw new DisputeError("Booking not found.");
    }
    const closedAt = booking.status === "completed" ? booking.completedAt : booking.status === "cancelled" ? booking.updatedAt : null;
    const [paid] = await tx
      .select({ id: schema.payments.id })
      .from(schema.payments)
      .where(and(eq(schema.payments.bookingId, booking.id), inArray(schema.payments.status, ["successful", "partially_refunded", "refunded"])))
      .limit(1);
    if (!paid || !withinDisputeWindow(booking.status, closedAt)) {
      throw new DisputeError("A problem can be reported on a paid booking, up to 14 days after it is completed or cancelled.");
    }
    const [dispute] = await tx
      .insert(schema.disputes)
      .values({
        bookingId: booking.id,
        openedBy: actor.id,
        openedByRole: actor.role,
        category: input.category as Dispute["category"],
        description: input.description,
      })
      .onConflictDoNothing()
      .returning();
    if (!dispute) {
      throw new DisputeError("There is already an open dispute on this booking. Add to it instead.");
    }
    if (attachment) {
      await tx.insert(schema.disputeMessages).values({
        disputeId: dispute.id,
        authorId: actor.id,
        authorRole: actor.role,
        body: "Evidence attached when the dispute was opened.",
        attachmentStorageKey: attachment.storageKey,
        attachmentFileName: attachment.fileName,
        attachmentContentType: attachment.contentType,
        attachmentSizeBytes: attachment.sizeBytes,
      });
    }
    await tx.update(schema.payouts).set({ status: "on_hold" }).where(and(eq(schema.payouts.bookingId, booking.id), eq(schema.payouts.status, "eligible")));
    await recordAudit({ actorId: actor.id, action: "dispute.opened", entityType: "dispute", entityId: dispute.id, metadata: { bookingId: booking.id, category: input.category } }, tx);
    return { dispute, booking };
  });
}

export async function addDisputeMessage(
  actor: DisputeActor,
  disputeId: string,
  body: string,
  attachment: StoredFile | null,
): Promise<{ dispute: Dispute; booking: Booking }> {
  return db().transaction(async (tx) => {
    const [current] = await tx.select().from(schema.disputes).where(eq(schema.disputes.id, disputeId)).limit(1).for("update");
    const [booking] = current ? await tx.select().from(schema.bookings).where(eq(schema.bookings.id, current.bookingId)).limit(1) : [];
    if (!current || !booking || !partyOf(actor, booking)) {
      throw new DisputeError("Dispute not found.");
    }
    if (!ACTIVE_DISPUTE_STATUSES.includes(current.status)) {
      throw new DisputeError("This dispute is closed. Contact support if you need to reopen it.");
    }
    await tx.insert(schema.disputeMessages).values({
      disputeId,
      authorId: actor.id,
      authorRole: actor.role,
      body,
      attachmentStorageKey: attachment?.storageKey ?? null,
      attachmentFileName: attachment?.fileName ?? null,
      attachmentContentType: attachment?.contentType ?? null,
      attachmentSizeBytes: attachment?.sizeBytes ?? null,
    });
    const reopen = actor.role !== "admin" && current.status === "awaiting_information";
    const [dispute] = await tx
      .update(schema.disputes)
      .set({ ...(reopen ? { status: "under_review" as const } : {}), updatedAt: sql`now()` })
      .where(eq(schema.disputes.id, disputeId))
      .returning();
    await recordAudit({ actorId: actor.id, action: "dispute.message_added", entityType: "dispute", entityId: disputeId, metadata: { attachment: Boolean(attachment) } }, tx);
    return { dispute, booking };
  });
}

export async function updateDisputeStatus(
  adminId: string,
  disputeId: string,
  input: { status: Exclude<DisputeStatus, "open">; resolution: string | null },
): Promise<{ dispute: Dispute; booking: Booking }> {
  return db().transaction(async (tx) => {
    const [current] = await tx.select().from(schema.disputes).where(eq(schema.disputes.id, disputeId)).limit(1).for("update");
    if (!current) {
      throw new DisputeError("Dispute not found.");
    }
    if (!ACTIVE_DISPUTE_STATUSES.includes(current.status)) {
      throw new DisputeError("This dispute is already closed.");
    }
    const closing = input.status === "resolved" || input.status === "closed";
    const [dispute] = await tx
      .update(schema.disputes)
      .set({
        status: input.status,
        assignedTo: current.assignedTo ?? adminId,
        ...(closing ? { resolution: input.resolution, resolvedAt: sql`now()` } : {}),
      })
      .where(eq(schema.disputes.id, disputeId))
      .returning();
    const [booking] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, dispute.bookingId)).limit(1).for("update");
    const statusNote = closing ? `Dispute ${input.status}: ${input.resolution}` : `Dispute status changed to ${input.status.replaceAll("_", " ")}.`;
    await tx.insert(schema.disputeMessages).values({ disputeId, authorId: adminId, authorRole: "admin", body: statusNote });
    if (closing && booking.status === "completed") {
      await tx.update(schema.payouts).set({ status: "eligible" }).where(and(eq(schema.payouts.bookingId, booking.id), eq(schema.payouts.status, "on_hold")));
    }
    await recordAudit({ actorId: adminId, action: `dispute.${input.status}`, entityType: "dispute", entityId: disputeId, metadata: { resolution: input.resolution } }, tx);
    return { dispute, booking };
  });
}

export async function assignDispute(adminId: string, disputeId: string): Promise<void> {
  const [dispute] = await db()
    .update(schema.disputes)
    .set({ assignedTo: adminId, status: sql`case when ${schema.disputes.status} = 'open' then 'under_review'::dispute_status else ${schema.disputes.status} end` })
    .where(and(eq(schema.disputes.id, disputeId), inArray(schema.disputes.status, ACTIVE_DISPUTE_STATUSES)))
    .returning();
  if (!dispute) {
    throw new DisputeError("This dispute is closed.");
  }
  await recordAudit({ actorId: adminId, action: "dispute.assigned", entityType: "dispute", entityId: disputeId });
}

export async function disputeThread(disputeId: string) {
  return db()
    .select({ message: schema.disputeMessages, authorName: schema.users.fullName })
    .from(schema.disputeMessages)
    .leftJoin(schema.users, eq(schema.users.id, schema.disputeMessages.authorId))
    .where(eq(schema.disputeMessages.disputeId, disputeId))
    .orderBy(asc(schema.disputeMessages.createdAt));
}

export async function latestDisputeForBooking(bookingId: string): Promise<Dispute | null> {
  const [dispute] = await db().select().from(schema.disputes).where(eq(schema.disputes.bookingId, bookingId)).orderBy(desc(schema.disputes.createdAt)).limit(1);
  return dispute ?? null;
}

export async function getDispute(disputeId: string) {
  const [row] = await db()
    .select({
      dispute: schema.disputes,
      booking: schema.bookings,
      openedByName: schema.users.fullName,
      vendorName: sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`,
    })
    .from(schema.disputes)
    .innerJoin(schema.bookings, eq(schema.bookings.id, schema.disputes.bookingId))
    .innerJoin(schema.users, eq(schema.users.id, schema.disputes.openedBy))
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.bookings.vendorId))
    .where(eq(schema.disputes.id, disputeId))
    .limit(1);
  return row ?? null;
}

export async function listDisputes(scope: "active" | "closed") {
  return db()
    .select({
      dispute: schema.disputes,
      bookingReference: schema.bookings.reference,
      openedByName: schema.users.fullName,
      vendorName: sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`,
    })
    .from(schema.disputes)
    .innerJoin(schema.bookings, eq(schema.bookings.id, schema.disputes.bookingId))
    .innerJoin(schema.users, eq(schema.users.id, schema.disputes.openedBy))
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.bookings.vendorId))
    .where(scope === "active" ? inArray(schema.disputes.status, ACTIVE_DISPUTE_STATUSES) : notInArray(schema.disputes.status, ACTIVE_DISPUTE_STATUSES))
    .orderBy(scope === "active" ? asc(schema.disputes.createdAt) : desc(schema.disputes.updatedAt))
    .limit(200);
}

export function disputeRole(role: UserRole | null): string {
  return role === "customer" ? "Shipper" : role === "vendor" ? "Vendor" : role === "admin" ? "WCE Logistics" : "User";
}
