"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { errorState, successState, type FormState } from "@/lib/form-state";
import { requireRole } from "@/server/auth/dal";
import { cancelBooking, MarketplaceError, respondToBooking } from "@/server/marketplace";
import { findVendorProfileByUser } from "@/server/vendors";

const id = z.uuid();
const reasonSchema = z.string().trim().min(5, "Give the shipper a short reason.").max(500);

async function vendorContext() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  return { user, profile };
}

export async function acceptBookingAction(bookingId: string): Promise<FormState> {
  const { user, profile } = await vendorContext();
  if (!id.safeParse(bookingId).success) {
    return errorState("Booking not found.");
  }
  try {
    await respondToBooking(profile.id, user.id, bookingId, "accept", null);
  } catch (error) {
    if (error instanceof MarketplaceError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Booking accepted. The shipper has been asked to pay.");
}

export async function declineBookingAction(bookingId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await vendorContext();
  const reason = reasonSchema.safeParse(formData.get("reason") ?? "");
  if (!id.safeParse(bookingId).success) {
    return errorState("Booking not found.");
  }
  if (!reason.success) {
    return errorState(reason.error.issues[0].message, { reason: [reason.error.issues[0].message] });
  }
  try {
    await respondToBooking(profile.id, user.id, bookingId, "reject", reason.data);
  } catch (error) {
    if (error instanceof MarketplaceError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Request declined.");
}

export async function vendorCancelBookingAction(bookingId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await vendorContext();
  const reason = reasonSchema.safeParse(formData.get("reason") ?? "");
  if (!id.safeParse(bookingId).success) {
    return errorState("Booking not found.");
  }
  if (!reason.success) {
    return errorState(reason.error.issues[0].message, { reason: [reason.error.issues[0].message] });
  }
  try {
    await cancelBooking({ id: user.id, role: "vendor", vendorId: profile.id }, bookingId, reason.data);
  } catch (error) {
    if (error instanceof MarketplaceError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Booking cancelled.");
}
