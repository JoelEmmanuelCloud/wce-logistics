"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { errorState, successState, validationErrorState, type FormState } from "@/lib/form-state";
import { shipmentSchema } from "@/lib/validation/marketplace";
import { recordAudit } from "@/server/audit";
import { requireRole } from "@/server/auth/dal";
import { db, schema } from "@/server/db";
import { cancelBooking, MarketplaceError, requestBooking } from "@/server/marketplace";
import { notifyBooking } from "@/server/notifications";

const id = z.uuid();

export async function createShipmentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("customer");
  const parsed = shipmentSchema.safeParse({
    originState: formData.get("originState") ?? "",
    originCity: formData.get("originCity") ?? "",
    originAddress: formData.get("originAddress") ?? "",
    destinationState: formData.get("destinationState") ?? "",
    destinationCity: formData.get("destinationCity") ?? "",
    destinationAddress: formData.get("destinationAddress") ?? "",
    cargoType: formData.get("cargoType") ?? "",
    description: formData.get("description") ?? "",
    weightKg: formData.get("weightKg") ?? "",
    packageCount: formData.get("packageCount") ?? "",
    declaredValueKobo: formData.get("declaredValueKobo") ?? "",
    pickupDate: formData.get("pickupDate") ?? "",
    handlingNotes: formData.get("handlingNotes") ?? "",
    bookingType: formData.get("bookingType") ?? "",
  });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }

  const [shipment] = await db()
    .insert(schema.shipments)
    .values({ ...parsed.data, customerId: user.id })
    .returning({ id: schema.shipments.id });
  await recordAudit({ actorId: user.id, action: "shipment.created", entityType: "shipment", entityId: shipment.id });
  redirect(`/account/shipments/${shipment.id}`);
}

export async function requestBookingAction(shipmentId: string, routeId: string): Promise<FormState> {
  const user = await requireRole("customer");
  if (!id.safeParse(shipmentId).success || !id.safeParse(routeId).success) {
    return errorState("This offer is no longer available.");
  }
  let bookingId: string;
  try {
    const booking = await requestBooking(user.id, shipmentId, routeId);
    bookingId = booking.id;
    after(() => notifyBooking("booking.requested", booking));
  } catch (error) {
    if (error instanceof MarketplaceError) {
      return errorState(error.message);
    }
    throw error;
  }
  redirect(`/account/bookings/${bookingId}`);
}

export async function cancelShipmentAction(shipmentId: string): Promise<FormState> {
  const user = await requireRole("customer");
  if (!id.safeParse(shipmentId).success) {
    return errorState("Shipment not found.");
  }
  const [cancelled] = await db()
    .update(schema.shipments)
    .set({ status: "cancelled" })
    .where(and(eq(schema.shipments.id, shipmentId), eq(schema.shipments.customerId, user.id), eq(schema.shipments.status, "open")))
    .returning({ id: schema.shipments.id });
  if (!cancelled) {
    return errorState("Only shipments without an active booking can be cancelled. Cancel the booking first.");
  }
  await recordAudit({ actorId: user.id, action: "shipment.cancelled", entityType: "shipment", entityId: cancelled.id });
  redirect("/account/shipments");
}

const reasonSchema = z.string().trim().min(5, "Tell the vendor briefly why you are cancelling.").max(500);

export async function customerCancelBookingAction(bookingId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("customer");
  const reason = reasonSchema.safeParse(formData.get("reason") ?? "");
  if (!id.safeParse(bookingId).success) {
    return errorState("Booking not found.");
  }
  if (!reason.success) {
    return errorState(reason.error.issues[0].message, { reason: [reason.error.issues[0].message] });
  }
  try {
    const cancelled = await cancelBooking({ id: user.id, role: "customer" }, bookingId, reason.data);
    after(() => notifyBooking("booking.cancelled", cancelled));
  } catch (error) {
    if (error instanceof MarketplaceError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Booking cancelled. Your shipment is open again if you want to choose another truck.");
}
