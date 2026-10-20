"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { errorState, successState, type FormState } from "@/lib/form-state";
import { requireRole } from "@/server/auth/dal";
import { cancelBooking, confirmOfflinePayment, MarketplaceError } from "@/server/marketplace";
import { notifyBooking } from "@/server/notifications";

const id = z.uuid();

export async function recordPaymentAction(bookingId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const reference = z
    .string()
    .trim()
    .min(4, "Enter the bank transfer or receipt reference.")
    .max(120)
    .safeParse(formData.get("reason") ?? "");
  if (!id.safeParse(bookingId).success) {
    return errorState("Booking not found.");
  }
  if (!reference.success) {
    return errorState(reference.error.issues[0].message, { reason: [reference.error.issues[0].message] });
  }
  try {
    const confirmed = await confirmOfflinePayment(admin.id, bookingId, reference.data);
    after(() => notifyBooking("booking.confirmed", confirmed));
  } catch (error) {
    if (error instanceof MarketplaceError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Payment recorded and booking confirmed.");
}

export async function adminCancelBookingAction(bookingId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const reason = z.string().trim().min(10, "Explain the cancellation in at least 10 characters.").max(500).safeParse(formData.get("reason") ?? "");
  if (!id.safeParse(bookingId).success) {
    return errorState("Booking not found.");
  }
  if (!reason.success) {
    return errorState(reason.error.issues[0].message, { reason: [reason.error.issues[0].message] });
  }
  try {
    const cancelled = await cancelBooking({ id: admin.id, role: "admin" }, bookingId, reason.data);
    after(() => notifyBooking("booking.cancelled", cancelled));
  } catch (error) {
    if (error instanceof MarketplaceError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Booking cancelled and capacity released.");
}
