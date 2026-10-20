"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { errorState, type FormState } from "@/lib/form-state";
import { site } from "@/lib/site";
import { requireRole } from "@/server/auth/dal";
import { PaymentError, startPaystackCheckout } from "@/server/payments";

export async function startCheckoutAction(bookingId: string): Promise<FormState> {
  const user = await requireRole("customer");
  if (!z.uuid().safeParse(bookingId).success) {
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
