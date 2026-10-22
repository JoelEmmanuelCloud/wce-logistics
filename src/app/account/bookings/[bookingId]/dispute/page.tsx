import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { customerDisputeReplyAction, customerOpenDisputeAction } from "@/app/account/bookings/actions";
import { BookingDispute } from "@/components/disputes/booking-dispute";
import { DisputeReplyForm, OpenDisputeForm } from "@/components/disputes/dispute-forms";
import { requireRole } from "@/server/auth/dal";
import { canOpenDispute, disputeThread, latestDisputeForBooking } from "@/server/disputes";
import { findBooking } from "@/server/marketplace";

export const metadata: Metadata = { title: "Dispute" };

export default async function CustomerDisputePage({ params }: PageProps<"/account/bookings/[bookingId]/dispute">) {
  const { bookingId } = await params;
  const user = await requireRole("customer");
  const booking = /^[0-9a-f-]{36}$/i.test(bookingId) ? await findBooking(bookingId) : null;
  if (!booking || booking.customerId !== user.id) {
    notFound();
  }
  const [dispute, canOpen] = await Promise.all([latestDisputeForBooking(booking.id), canOpenDispute(booking)]);
  const thread = dispute ? await disputeThread(dispute.id) : [];

  return (
    <BookingDispute
      booking={booking}
      backHref={`/account/bookings/${booking.id}`}
      dispute={dispute}
      thread={thread}
      canOpen={canOpen}
      openForm={<OpenDisputeForm action={customerOpenDisputeAction.bind(null, booking.id)} />}
      replyForm={dispute ? <DisputeReplyForm action={customerDisputeReplyAction.bind(null, dispute.id)} /> : null}
    />
  );
}
