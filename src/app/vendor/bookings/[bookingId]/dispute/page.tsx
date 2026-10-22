import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { vendorDisputeReplyAction, vendorOpenDisputeAction } from "@/app/vendor/bookings/actions";
import { BookingDispute } from "@/components/disputes/booking-dispute";
import { DisputeReplyForm, OpenDisputeForm } from "@/components/disputes/dispute-forms";
import { requireRole } from "@/server/auth/dal";
import { canOpenDispute, disputeThread, latestDisputeForBooking } from "@/server/disputes";
import { findBooking } from "@/server/marketplace";
import { getPlatformSettings } from "@/server/settings";
import { findVendorProfileByUser } from "@/server/vendors";

export const metadata: Metadata = { title: "Dispute" };

export default async function VendorDisputePage({ params }: PageProps<"/vendor/bookings/[bookingId]/dispute">) {
  const { bookingId } = await params;
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  const booking = /^[0-9a-f-]{36}$/i.test(bookingId) ? await findBooking(bookingId) : null;
  if (!booking || booking.vendorId !== profile.id) {
    notFound();
  }
  const [dispute, canOpen, settings] = await Promise.all([latestDisputeForBooking(booking.id), canOpenDispute(booking), getPlatformSettings()]);
  const thread = dispute ? await disputeThread(dispute.id) : [];

  return (
    <BookingDispute
      booking={booking}
      backHref={`/vendor/bookings/${booking.id}`}
      dispute={dispute}
      thread={thread}
      canOpen={canOpen}
      windowDays={settings.disputeWindowDays}
      openForm={<OpenDisputeForm action={vendorOpenDisputeAction.bind(null, booking.id)} />}
      replyForm={dispute ? <DisputeReplyForm action={vendorDisputeReplyAction.bind(null, dispute.id)} /> : null}
    />
  );
}
