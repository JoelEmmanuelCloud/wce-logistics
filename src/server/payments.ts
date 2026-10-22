import "server-only";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { recordAudit } from "@/server/audit";
import { db, schema, type Database } from "@/server/db";
import type { Booking, Payment } from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import { initializeTransaction, PaystackError, paystackConfigured, refundTransaction, verifyTransaction } from "@/server/paystack";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export class PaymentError extends Error {}

const INACTIVE_BOOKING_STATUSES: Booking["status"][] = ["cancelled", "rejected", "expired"];

export function splitCommission(totalKobo: number, bps = serverEnv().PLATFORM_COMMISSION_BPS): { platformFeeKobo: number; vendorPayableKobo: number } {
  const platformFeeKobo = Math.round((totalKobo * bps) / 10_000);
  return { platformFeeKobo, vendorPayableKobo: totalKobo - platformFeeKobo };
}

function paymentReference(bookingReference: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let index = 0; index < 6; index += 1) {
    suffix += alphabet[randomInt(0, alphabet.length)];
  }
  return `${bookingReference}-${suffix}`;
}

async function confirmPaidBooking(tx: Transaction, booking: Booking, payment: Payment, actorId: string | null, note: string): Promise<Booking> {
  const { platformFeeKobo, vendorPayableKobo } = splitCommission(payment.amountKobo);
  await tx
    .update(schema.payments)
    .set({ status: "successful", paidAt: sql`coalesce(${schema.payments.paidAt}, now())`, platformFeeKobo, vendorPayableKobo })
    .where(eq(schema.payments.id, payment.id));
  const [confirmed] = await tx
    .update(schema.bookings)
    .set({ status: "confirmed", statusNote: note })
    .where(and(eq(schema.bookings.id, booking.id), eq(schema.bookings.status, "awaiting_payment")))
    .returning();
  await tx.insert(schema.payouts).values({ bookingId: booking.id, vendorId: booking.vendorId, paymentId: payment.id, amountKobo: vendorPayableKobo });
  await tx.insert(schema.bookingEvents).values({ bookingId: booking.id, status: "confirmed", actorId, note });
  await recordAudit(
    {
      actorId,
      action: "payment.succeeded",
      entityType: "payment",
      entityId: payment.id,
      metadata: { bookingId: booking.id, provider: payment.provider, amountKobo: payment.amountKobo, platformFeeKobo },
    },
    tx,
  );
  return confirmed;
}

export async function startPaystackCheckout(customer: { id: string; email: string }, bookingId: string, callbackUrl: string): Promise<string> {
  if (!paystackConfigured()) {
    throw new PaymentError("Online payment is not available yet. Our team will contact you with payment details.");
  }
  const [booking] = await db().select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).limit(1);
  if (!booking || booking.customerId !== customer.id) {
    throw new PaymentError("Booking not found.");
  }
  if (booking.status !== "awaiting_payment") {
    throw new PaymentError("This booking is not awaiting payment.");
  }

  const reference = paymentReference(booking.reference);
  const [payment] = await db()
    .insert(schema.payments)
    .values({ bookingId: booking.id, provider: "paystack", reference, amountKobo: booking.totalKobo, currency: booking.currency })
    .returning();

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: customer.email,
      amountKobo: booking.totalKobo,
      reference,
      callbackUrl,
      metadata: { bookingId: booking.id, bookingReference: booking.reference, paymentId: payment.id },
    });
    await recordAudit({ actorId: customer.id, action: "payment.initialized", entityType: "payment", entityId: payment.id, metadata: { bookingId: booking.id } });
    return authorizationUrl;
  } catch (error) {
    await db()
      .update(schema.payments)
      .set({ status: "failed", failureReason: error instanceof Error ? error.message.slice(0, 500) : "initialization failed" })
      .where(eq(schema.payments.id, payment.id));
    if (error instanceof PaystackError) {
      console.error(error);
      throw new PaymentError("We could not start the payment. Please try again in a moment.");
    }
    throw error;
  }
}

export type SettlementOutcome =
  | { outcome: "paid"; bookingId: string; booking: Booking }
  | { outcome: "already_settled" | "pending" | "failed" | "refund_required"; bookingId: string };

export async function settlePaystackReference(reference: string, source: "callback" | "webhook"): Promise<SettlementOutcome | null> {
  const [existing] = await db().select().from(schema.payments).where(eq(schema.payments.reference, reference)).limit(1);
  if (!existing || existing.provider !== "paystack") {
    return null;
  }
  if (existing.status !== "pending") {
    return { outcome: "already_settled", bookingId: existing.bookingId };
  }

  const transaction = await verifyTransaction(reference);

  return db().transaction(async (tx) => {
    const [payment] = await tx.select().from(schema.payments).where(eq(schema.payments.id, existing.id)).limit(1).for("update");
    if (payment.status !== "pending") {
      return { outcome: "already_settled", bookingId: payment.bookingId } as const;
    }
    const [booking] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, payment.bookingId)).limit(1).for("update");

    if (transaction.status !== "success") {
      if (transaction.status === "failed" || transaction.status === "abandoned" || transaction.status === "reversed") {
        await tx
          .update(schema.payments)
          .set({ status: "failed", failureReason: transaction.gateway_response ?? transaction.status, providerTransactionId: String(transaction.id) })
          .where(eq(schema.payments.id, payment.id));
        return { outcome: "failed", bookingId: booking.id } as const;
      }
      return { outcome: "pending", bookingId: booking.id } as const;
    }

    if (transaction.reference !== payment.reference || transaction.amount !== payment.amountKobo || transaction.currency !== payment.currency) {
      await tx
        .update(schema.payments)
        .set({ status: "failed", failureReason: `Verification mismatch: paid ${transaction.amount} ${transaction.currency}, expected ${payment.amountKobo} ${payment.currency}` })
        .where(eq(schema.payments.id, payment.id));
      await recordAudit({ actorId: null, action: "payment.mismatch", entityType: "payment", entityId: payment.id, metadata: { amount: transaction.amount, currency: transaction.currency } }, tx);
      return { outcome: "failed", bookingId: booking.id } as const;
    }

    await tx
      .update(schema.payments)
      .set({ providerTransactionId: String(transaction.id), channel: transaction.channel, paidAt: transaction.paid_at ? new Date(transaction.paid_at) : sql`now()` })
      .where(eq(schema.payments.id, payment.id));

    if (booking.status !== "awaiting_payment") {
      const { platformFeeKobo, vendorPayableKobo } = splitCommission(payment.amountKobo);
      await tx
        .update(schema.payments)
        .set({ status: "successful", platformFeeKobo, vendorPayableKobo, failureReason: `Paid after the booking became ${booking.status}. Refund required.` })
        .where(eq(schema.payments.id, payment.id));
      await recordAudit({ actorId: null, action: "payment.refund_required", entityType: "payment", entityId: payment.id, metadata: { bookingStatus: booking.status, source } }, tx);
      return { outcome: "refund_required", bookingId: booking.id } as const;
    }

    const confirmed = await confirmPaidBooking(tx, booking, payment, null, `Paid online with Paystack. Reference: ${payment.reference}`);
    return { outcome: "paid", bookingId: booking.id, booking: confirmed } as const;
  });
}

export async function recordOfflinePayment(adminId: string, bookingId: string, transferReference: string): Promise<Booking> {
  return db().transaction(async (tx) => {
    const [booking] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).limit(1).for("update");
    if (!booking) {
      throw new PaymentError("Booking not found.");
    }
    if (booking.status !== "awaiting_payment") {
      throw new PaymentError("Only bookings awaiting payment can be confirmed.");
    }
    const [payment] = await tx
      .insert(schema.payments)
      .values({
        bookingId: booking.id,
        provider: "offline",
        reference: `${booking.reference}-OFFLINE-${transferReference.replace(/[^A-Za-z0-9-]/g, "").slice(0, 40)}`,
        providerTransactionId: transferReference,
        amountKobo: booking.totalKobo,
        currency: booking.currency,
        channel: "bank_transfer",
      })
      .returning();
    return confirmPaidBooking(tx, booking, payment, adminId, `Payment received offline. Reference: ${transferReference}`);
  });
}

export async function refundPayment(adminId: string, paymentId: string, reason: string): Promise<{ booking: Booking; payment: Payment }> {
  const [payment] = await db().select().from(schema.payments).where(eq(schema.payments.id, paymentId)).limit(1);
  if (!payment || payment.status !== "successful") {
    throw new PaymentError("Only successful payments can be refunded.");
  }
  const [booking] = await db().select().from(schema.bookings).where(eq(schema.bookings.id, payment.bookingId)).limit(1);
  if (!INACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    throw new PaymentError("Cancel the booking before refunding its payment.");
  }

  let providerRefundId: string | null = null;
  if (payment.provider === "paystack") {
    try {
      const refund = await refundTransaction(payment.reference, payment.amountKobo);
      providerRefundId = String(refund.id);
    } catch (error) {
      if (error instanceof PaystackError) {
        console.error(error);
        throw new PaymentError("Paystack could not process the refund. Try again or refund manually.");
      }
      throw error;
    }
  }

  return db().transaction(async (tx) => {
    const [updated] = await tx
      .update(schema.payments)
      .set({ status: "refunded", refundedKobo: payment.amountKobo })
      .where(and(eq(schema.payments.id, payment.id), eq(schema.payments.status, "successful")))
      .returning();
    if (!updated) {
      throw new PaymentError("This payment was already refunded.");
    }
    await tx
      .update(schema.payouts)
      .set({ status: "cancelled", note: `Payment refunded: ${reason}` })
      .where(and(eq(schema.payouts.paymentId, payment.id), inArray(schema.payouts.status, ["on_hold", "eligible"])));
    await recordAudit(
      { actorId: adminId, action: "payment.refunded", entityType: "payment", entityId: payment.id, metadata: { reason, providerRefundId, amountKobo: payment.amountKobo } },
      tx,
    );
    return { booking, payment: updated };
  });
}

export async function markPayoutPaid(adminId: string, payoutId: string, transferReference: string): Promise<void> {
  await db().transaction(async (tx) => {
    const [current] = await tx.select().from(schema.payouts).where(eq(schema.payouts.id, payoutId)).limit(1).for("update");
    if (!current || current.status !== "eligible") {
      throw new PaymentError("Only payouts for completed bookings without an open dispute can be paid.");
    }
    const [dispute] = await tx
      .select({ id: schema.disputes.id })
      .from(schema.disputes)
      .where(and(eq(schema.disputes.bookingId, current.bookingId), notInArray(schema.disputes.status, ["resolved", "closed"])))
      .limit(1);
    if (dispute) {
      throw new PaymentError("This booking has an open dispute. Resolve it before paying the vendor.");
    }
    const [payout] = await tx
      .update(schema.payouts)
      .set({ status: "paid", transferReference, paidAt: sql`now()`, paidBy: adminId })
      .where(eq(schema.payouts.id, current.id))
      .returning();
    await recordAudit({ actorId: adminId, action: "payout.paid", entityType: "payout", entityId: payout.id, metadata: { transferReference, amountKobo: payout.amountKobo } }, tx);
  });
}

const bookingRef = schema.bookings.reference;

export async function listPayments() {
  return db()
    .select({ payment: schema.payments, bookingReference: bookingRef, bookingStatus: schema.bookings.status })
    .from(schema.payments)
    .innerJoin(schema.bookings, eq(schema.bookings.id, schema.payments.bookingId))
    .orderBy(desc(schema.payments.createdAt))
    .limit(200);
}

export async function listPayouts(filter: { vendorId?: string; bookingId?: string } = {}) {
  const conditions = [];
  if (filter.vendorId) conditions.push(eq(schema.payouts.vendorId, filter.vendorId));
  if (filter.bookingId) conditions.push(eq(schema.payouts.bookingId, filter.bookingId));
  return db()
    .select({
      payout: schema.payouts,
      bookingReference: bookingRef,
      bookingStatus: schema.bookings.status,
      vendorName: sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`,
    })
    .from(schema.payouts)
    .innerJoin(schema.bookings, eq(schema.bookings.id, schema.payouts.bookingId))
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.payouts.vendorId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.payouts.createdAt))
    .limit(200);
}

export async function paymentsForBooking(bookingId: string): Promise<Payment[]> {
  return db().select().from(schema.payments).where(eq(schema.payments.bookingId, bookingId)).orderBy(desc(schema.payments.createdAt));
}
