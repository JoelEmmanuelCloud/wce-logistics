import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { declineBookingAction, vendorCancelBookingAction } from "@/app/vendor/bookings/actions";
import { BookingHeader, BookingSummary, BookingTimeline } from "@/components/marketplace/booking-detail";
import { ReasonActionForm } from "@/components/marketplace/reason-action-form";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader, DescriptionList } from "@/components/ui/card";
import { formatDateTime } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { requireRole } from "@/server/auth/dal";
import { getBookingDetail } from "@/server/marketplace";
import { findVendorProfileByUser } from "@/server/vendors";
import { AcceptButton } from "../accept-button";

export const metadata: Metadata = { title: "Booking" };

const CONTACT_VISIBLE = ["awaiting_payment", "confirmed", "pickup_scheduled", "goods_collected", "in_transit", "delivery_attempted", "delivered"];

export default async function VendorBookingPage({ params }: PageProps<"/vendor/bookings/[bookingId]">) {
  const { bookingId } = await params;
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  const detail = /^[0-9a-f-]{36}$/i.test(bookingId) ? await getBookingDetail(bookingId) : null;
  if (!detail || detail.booking.vendorId !== profile.id) {
    notFound();
  }
  const { booking } = detail;
  const pending = booking.status === "pending_vendor_acceptance";
  const cancellable = booking.status === "awaiting_payment" || booking.status === "confirmed";

  return (
    <>
      <Link href="/vendor/bookings" className="text-[14px] font-semibold text-navy/70 hover:text-navy">
        Back to bookings
      </Link>
      <BookingHeader detail={detail} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <BookingSummary detail={detail} />
        <div className="order-first grid content-start gap-6 xl:order-none">
          {pending && (
            <Card tone="attention">
              <CardHeader title="Respond to this request" description={`Answer before ${formatDateTime(booking.responseDueAt)} or the request expires.`} />
              <div className="grid gap-4">
                <AcceptButton bookingId={booking.id} />
                <ReasonActionForm
                  action={declineBookingAction.bind(null, booking.id)}
                  trigger="Decline"
                  confirmLabel="Decline request"
                  reasonLabel="Reason for declining (shown to the shipper)"
                />
              </div>
            </Card>
          )}
          {booking.status === "awaiting_payment" && (
            <Alert tone="info" title="Waiting for the shipper's payment">
              The trip space stays reserved. You will see the booking as confirmed once payment is received.
            </Alert>
          )}
          {CONTACT_VISIBLE.includes(booking.status) && (
            <Card>
              <CardHeader title="Shipper" />
              <DescriptionList
                items={[
                  { label: "Name", value: detail.customerName },
                  { label: "Phone", value: formatPhone(detail.customerPhone) },
                ]}
              />
            </Card>
          )}
          {cancellable && (
            <Card tone="danger">
              <CardHeader title="Cancel booking" description="Only cancel if the truck genuinely cannot make this trip. Cancellations are recorded and reviewed by our team." />
              <ReasonActionForm
                action={vendorCancelBookingAction.bind(null, booking.id)}
                trigger="Cancel booking"
                confirmLabel="Confirm cancellation"
                reasonLabel="Reason for cancelling (shown to the shipper)"
              />
            </Card>
          )}
          <BookingTimeline detail={detail} />
        </div>
      </div>
    </>
  );
}
