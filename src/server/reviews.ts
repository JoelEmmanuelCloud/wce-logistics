import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { recordAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import type { Review } from "@/server/db/schema";

export class ReviewError extends Error {}

export async function submitReview(customerId: string, bookingId: string, input: { rating: number; comment: string | null }): Promise<{ review: Review; bookingReference: string }> {
  return db().transaction(async (tx) => {
    const [booking] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).limit(1).for("update");
    if (!booking || booking.customerId !== customerId) {
      throw new ReviewError("Booking not found.");
    }
    if (booking.status !== "completed") {
      throw new ReviewError("You can review a booking once it is completed.");
    }
    const [review] = await tx
      .insert(schema.reviews)
      .values({ bookingId: booking.id, customerId, vendorId: booking.vendorId, rating: input.rating, comment: input.comment })
      .onConflictDoNothing({ target: schema.reviews.bookingId })
      .returning();
    if (!review) {
      throw new ReviewError("You have already reviewed this booking.");
    }
    await recordAudit({ actorId: customerId, action: "review.submitted", entityType: "review", entityId: review.id, metadata: { bookingId: booking.id, rating: input.rating } }, tx);
    return { review, bookingReference: booking.reference };
  });
}

export async function reviewForBooking(bookingId: string): Promise<Review | null> {
  const [review] = await db().select().from(schema.reviews).where(eq(schema.reviews.bookingId, bookingId)).limit(1);
  return review ?? null;
}

export type VendorRating = { average: number; count: number };

export async function vendorRatings(vendorIds: string[]): Promise<Map<string, VendorRating>> {
  if (vendorIds.length === 0) {
    return new Map();
  }
  const rows = await db()
    .select({ vendorId: schema.reviews.vendorId, average: sql<string>`avg(${schema.reviews.rating})`, count: sql<number>`count(*)::int` })
    .from(schema.reviews)
    .where(and(inArray(schema.reviews.vendorId, [...new Set(vendorIds)]), eq(schema.reviews.status, "published")))
    .groupBy(schema.reviews.vendorId);
  return new Map(rows.map((row) => [row.vendorId, { average: Math.round(Number(row.average) * 10) / 10, count: row.count }]));
}

export async function listReviews(filter: { vendorId?: string } = {}) {
  return db()
    .select({
      review: schema.reviews,
      bookingReference: schema.bookings.reference,
      customerName: schema.users.fullName,
      vendorName: sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`,
    })
    .from(schema.reviews)
    .innerJoin(schema.bookings, eq(schema.bookings.id, schema.reviews.bookingId))
    .innerJoin(schema.users, eq(schema.users.id, schema.reviews.customerId))
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.reviews.vendorId))
    .where(filter.vendorId ? and(eq(schema.reviews.vendorId, filter.vendorId), eq(schema.reviews.status, "published")) : undefined)
    .orderBy(desc(schema.reviews.createdAt))
    .limit(200);
}

export async function setReviewStatus(adminId: string, reviewId: string, status: "published" | "hidden", note: string): Promise<void> {
  await db().transaction(async (tx) => {
    const [review] = await tx
      .update(schema.reviews)
      .set({ status, moderationNote: note, moderatedBy: adminId, moderatedAt: sql`now()` })
      .where(eq(schema.reviews.id, reviewId))
      .returning();
    if (!review) {
      throw new ReviewError("Review not found.");
    }
    await recordAudit({ actorId: adminId, action: status === "hidden" ? "review.hidden" : "review.restored", entityType: "review", entityId: review.id, metadata: { note } }, tx);
  });
}
