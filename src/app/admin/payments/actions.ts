"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { errorState, successState, type FormState } from "@/lib/form-state";
import { requireRole } from "@/server/auth/dal";
import { findBooking } from "@/server/marketplace";
import { notifyBooking, notifyPayoutSent } from "@/server/notifications";
import type { Payout } from "@/server/db/schema";
import { markPayoutPaid, PaymentError, payWithPaystack, refundPayment } from "@/server/payments";

const id = z.uuid();

export async function refundPaymentAction(paymentId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const reason = z.string().trim().min(10, "Explain the refund in at least 10 characters.").max(500).safeParse(formData.get("reason") ?? "");
  if (!id.safeParse(paymentId).success) {
    return errorState("Payment not found.");
  }
  if (!reason.success) {
    return errorState(reason.error.issues[0].message, { reason: [reason.error.issues[0].message] });
  }
  try {
    const { booking } = await refundPayment(admin.id, paymentId, reason.data);
    after(() => notifyBooking("payment.refunded", booking));
  } catch (error) {
    if (error instanceof PaymentError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Refund issued.");
}

export async function markPayoutPaidAction(payoutId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const reference = z.string().trim().min(4, "Enter the bank transfer reference.").max(120).safeParse(formData.get("reason") ?? "");
  if (!id.safeParse(payoutId).success) {
    return errorState("Payout not found.");
  }
  if (!reference.success) {
    return errorState(reference.error.issues[0].message, { reason: [reference.error.issues[0].message] });
  }
  try {
    const payout = await markPayoutPaid(admin.id, payoutId, reference.data);
    after(() => notifyPaidPayout(payout));
  } catch (error) {
    if (error instanceof PaymentError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Payout marked as paid.");
}

async function notifyPaidPayout(payout: Payout) {
  const booking = await findBooking(payout.bookingId);
  if (booking) {
    await notifyPayoutSent(payout, booking.reference);
  }
}

export async function payWithPaystackAction(payoutId: string): Promise<FormState> {
  const admin = await requireRole("admin");
  if (!id.safeParse(payoutId).success) {
    return errorState("Payout not found.");
  }
  let message: string;
  try {
    const result = await payWithPaystack(admin.id, payoutId);
    if (result.outcome === "paid") {
      after(() => notifyPaidPayout(result.payout));
      message = "Transfer completed.";
    } else if (result.outcome === "processing") {
      message = "Transfer started. The payout is marked paid when Paystack confirms it.";
    } else {
      return errorState(result.payout.failureReason ?? "The transfer failed.");
    }
  } catch (error) {
    if (error instanceof PaymentError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState(message);
}
