"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { errorState, successState, validationErrorState, type FormState } from "@/lib/form-state";
import { site } from "@/lib/site";
import { reviewSchema } from "@/lib/validation/delivery";
import { requireRole } from "@/server/auth/dal";
import { confirmReceipt, DeliveryError } from "@/server/delivery";
import { openDisputeFromForm, replyToDisputeFromForm } from "@/server/dispute-form";
import { notifyDelivery, notifyReviewReceived } from "@/server/notifications";
import { PaymentError, startPaystackCheckout } from "@/server/payments";
import { ReviewError, submitReview } from "@/server/reviews";

const id = z.uuid();

export async function startCheckoutAction(bookingId: string): Promise<FormState> {
  const user = await requireRole("customer");
  if (!id.safeParse(bookingId).success) {
    return errorState("Booking not found.");
  }
  let authorizationUrl: string;
  try {
    authorizationUrl = await startPaystackCheckout(user, bookingId, new URL("/payments/paystack/callback", site.url).toString());
  } catch (error) {
    if (error instanceof PaymentError) {
      return errorState(error.message);
    }
    throw error;
  }
  redirect(authorizationUrl);
}

export async function confirmReceiptAction(bookingId: string): Promise<FormState> {
  const user = await requireRole("customer");
  if (!id.safeParse(bookingId).success) {
    return errorState("Booking not found.");
  }
  try {
    const booking = await confirmReceipt(user.id, bookingId);
    after(() => notifyDelivery("completed", booking));
  } catch (error) {
    if (error instanceof DeliveryError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Thank you. The booking is complete.");
}

export async function submitReviewAction(bookingId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("customer");
  if (!id.safeParse(bookingId).success) {
    return errorState("Booking not found.");
  }
  const parsed = reviewSchema.safeParse({ rating: formData.get("rating") ?? "", comment: formData.get("comment") ?? "" });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  try {
    const { review, bookingReference } = await submitReview(user.id, bookingId, parsed.data);
    after(() => notifyReviewReceived(review.vendorId, bookingReference, review.rating));
  } catch (error) {
    if (error instanceof ReviewError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Thank you for your review.");
}

export async function customerOpenDisputeAction(bookingId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("customer");
  if (!id.safeParse(bookingId).success) {
    return errorState("Booking not found.");
  }
  return openDisputeFromForm({ id: user.id, role: "customer" }, bookingId, formData);
}

export async function customerDisputeReplyAction(disputeId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("customer");
  if (!id.safeParse(disputeId).success) {
    return errorState("Dispute not found.");
  }
  return replyToDisputeFromForm({ id: user.id, role: "customer" }, disputeId, formData);
}
