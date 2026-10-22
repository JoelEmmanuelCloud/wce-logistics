import { after, NextResponse } from "next/server";
import { findBooking } from "@/server/marketplace";
import { notifyBooking, notifyPayoutSent } from "@/server/notifications";
import { validWebhookSignature } from "@/server/paystack";
import { settlePaystackReference, settleTransferReference } from "@/server/payments";

type PaystackEvent = { event?: string; data?: { reference?: string } };

const TRANSFER_EVENTS = new Set(["transfer.success", "transfer.failed", "transfer.reversed"]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validWebhookSignature(rawBody, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: PaystackEvent;
  try {
    payload = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const reference = typeof payload.data?.reference === "string" ? payload.data.reference : null;
  if (payload.event === "charge.success" && reference) {
    const result = await settlePaystackReference(reference, "webhook");
    if (result?.outcome === "paid") {
      const booking = result.booking;
      after(() => notifyBooking("booking.confirmed", booking));
    }
  }

  if (payload.event && TRANSFER_EVENTS.has(payload.event) && reference) {
    const result = await settleTransferReference(reference);
    if (result?.outcome === "paid" && result.changed) {
      const payout = result.payout;
      after(async () => {
        const booking = await findBooking(payout.bookingId);
        if (booking) {
          await notifyPayoutSent(payout, booking.reference);
        }
      });
    }
  }

  return NextResponse.json({ received: true });
}
