"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { errorState, successState, type FormState } from "@/lib/form-state";
import { requireRole } from "@/server/auth/dal";
import { assignDriver, DeliveryError } from "@/server/delivery";
import { applyDeliveryUpdate } from "@/server/delivery-form";
import { cancelBooking, MarketplaceError, respondToBooking } from "@/server/marketplace";
import { notifyBooking, notifyDelivery } from "@/server/notifications";
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
    const accepted = await respondToBooking(profile.id, user.id, bookingId, "accept", null);
    after(() => notifyBooking("booking.accepted", accepted));
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
    const declined = await respondToBooking(profile.id, user.id, bookingId, "reject", reason.data);
    after(() => notifyBooking("booking.declined", declined));
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
    const cancelled = await cancelBooking({ id: user.id, role: "vendor", vendorId: profile.id }, bookingId, reason.data);
    after(() => notifyBooking("booking.cancelled", cancelled));
  } catch (error) {
    if (error instanceof MarketplaceError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Booking cancelled.");
}

export async function assignDriverAction(bookingId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await vendorContext();
  const driverId = id.safeParse(formData.get("driverId"));
  if (!id.safeParse(bookingId).success) {
    return errorState("Booking not found.");
  }
  if (!driverId.success) {
    return errorState("Choose a driver.", { driverId: ["Choose a driver."] });
  }
  try {
    const { booking, driver } = await assignDriver(profile.id, user.id, bookingId, driverId.data);
    after(() => notifyDelivery("driver_assigned", booking, { driverUserId: driver.userId, driverName: driver.fullName, driverPhone: driver.phone }));
  } catch (error) {
    if (error instanceof DeliveryError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Driver assigned. The shipper and the driver have been emailed.");
}

export async function vendorDeliveryUpdateAction(bookingId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await vendorContext();
  if (!id.safeParse(bookingId).success) {
    return errorState("Booking not found.");
  }
  return applyDeliveryUpdate({ userId: user.id, role: "vendor", vendorId: profile.id }, bookingId, formData);
}
