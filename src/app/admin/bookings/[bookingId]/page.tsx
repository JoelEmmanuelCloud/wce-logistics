import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminCancelBookingAction, recordPaymentAction } from "@/app/admin/bookings/actions";
import { BookingHeader, BookingSummary, BookingTimeline } from "@/components/marketplace/booking-detail";
import { ReasonActionForm } from "@/components/marketplace/reason-action-form";
import { Card, CardHeader, DescriptionList } from "@/components/ui/card";
import { formatPhone } from "@/lib/phone";
import { formatNaira } from "@/lib/pricing";
import { requireRole } from "@/server/auth/dal";
import { getBookingDetail, OPEN_BOOKING_STATUSES } from "@/server/marketplace";

export const metadata: Metadata = { title: "Booking" };

export default async function AdminBookingPage({ params }: PageProps<"/admin/bookings/[bookingId]">) {
  await requireRole("admin");
  const { bookingId } = await params;
  const detail = /^[0-9a-f-]{36}$/i.test(bookingId) ? await getBookingDetail(bookingId) : null;
  if (!detail) {
    notFound();
  }
  const { booking } = detail;

  return (
    <>
      <Link href="/admin/bookings" className="text-[14px] font-semibold text-navy/70 hover:text-navy">
        Back to bookings
      </Link>
      <BookingHeader detail={detail} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <BookingSummary detail={detail} />
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Parties" />
            <DescriptionList
              items={[
                { label: "Shipper", value: detail.customerName },
                { label: "Shipper phone", value: formatPhone(detail.customerPhone) },
                {
                  label: "Vendor",
                  value: (
                    <Link href={`/admin/vendors/${booking.vendorId}`} className="font-semibold underline decoration-orange decoration-2 underline-offset-4">
                      {detail.vendorName}
                    </Link>
                  ),
                },
                { label: "Vendor email", value: detail.vendorEmail },
              ]}
            />
          </Card>
          {booking.status === "awaiting_payment" && (
            <Card tone="attention">
              <CardHeader title="Record payment" description={`Confirm once ${formatNaira(booking.totalKobo)} has reached the company account.`} />
              <ReasonActionForm
                action={recordPaymentAction.bind(null, booking.id)}
                trigger="Record offline payment"
                triggerVariant="secondary"
                confirmLabel="Confirm payment received"
                reasonLabel="Bank transfer or receipt reference"
                variant="secondary"
              />
            </Card>
          )}
          {OPEN_BOOKING_STATUSES.includes(booking.status) && (
            <Card tone="danger">
              <CardHeader title="Cancel booking" description="Releases the reserved capacity. Both parties will see the reason." />
              <ReasonActionForm
                action={adminCancelBookingAction.bind(null, booking.id)}
                trigger="Cancel booking"
                confirmLabel="Confirm cancellation"
                reasonLabel="Reason for cancelling"
              />
            </Card>
          )}
          <BookingTimeline detail={detail} />
        </div>
      </div>
    </>
  );
}
