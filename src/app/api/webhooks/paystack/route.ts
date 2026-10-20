import { after, NextResponse } from "next/server";
import { notifyBooking } from "@/server/notifications";
import { validWebhookSignature } from "@/server/paystack";
import { settlePaystackReference } from "@/server/payments";

type PaystackEvent = { event?: string; data?: { reference?: string } };

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

  if (payload.event === "charge.success" && typeof payload.data?.reference === "string") {
    const result = await settlePaystackReference(payload.data.reference, "webhook");
    if (result?.outcome === "paid") {
      const booking = result.booking;
      after(() => notifyBooking("booking.confirmed", booking));
    }
  }

  return NextResponse.json({ received: true });
}
