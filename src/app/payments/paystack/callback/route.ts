import { after, NextResponse, type NextRequest } from "next/server";
import { notifyBooking } from "@/server/notifications";
import { PaystackError } from "@/server/paystack";
import { settlePaystackReference } from "@/server/payments";

const REFERENCE_PATTERN = /^WCE-[A-Z2-9]{8}-[A-Z2-9]{6}$/;

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? request.nextUrl.searchParams.get("trxref") ?? "";
  if (!REFERENCE_PATTERN.test(reference)) {
    return NextResponse.redirect(new URL("/account/bookings", request.url), 303);
  }

  let outcome: string = "pending";
  let bookingId: string | null = null;
  try {
    const result = await settlePaystackReference(reference, "callback");
    if (result) {
      bookingId = result.bookingId;
      outcome = result.outcome === "already_settled" ? "paid" : result.outcome;
      if (result.outcome === "paid") {
        const booking = result.booking;
        after(() => notifyBooking("booking.confirmed", booking));
      }
    }
  } catch (error) {
    if (!(error instanceof PaystackError)) {
      throw error;
    }
    console.error(error);
  }

  const target = bookingId ? new URL(`/account/bookings/${bookingId}`, request.url) : new URL("/account/bookings", request.url);
  target.searchParams.set("payment", outcome);
  return NextResponse.redirect(target, 303);
}
