import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { customerCancelBookingAction } from "@/app/account/shipments/actions";
import { BookingHeader, BookingSummary, BookingTimeline } from "@/components/marketplace/booking-detail";
import { ReasonActionForm } from "@/components/marketplace/reason-action-form";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { site } from "@/lib/site";
import { requireRole } from "@/server/auth/dal";
import { CUSTOMER_CANCELLABLE, getBookingDetail } from "@/server/marketplace";
import { paystackConfigured } from "@/server/paystack";
import { PayButton } from "./pay-button";

export const metadata: Metadata = { title: "Booking" };

export default async function CustomerBookingPage({ params, searchParams }: PageProps<"/account/bookings/[bookingId]">) {
  const { bookingId } = await params;
  const { payment } = await searchParams;
  const user = await requireRole("customer");
  const detail = /^[0-9a-f-]{36}$/i.test(bookingId) ? await getBookingDetail(bookingId) : null;
  if (!detail || detail.booking.customerId !== user.id) {
    notFound();
  }
  const { booking } = detail;
  const contactEmail = site.contactEmail;
  const onlinePayments = paystackConfigured();
  const paymentNotice = {
    failed: { tone: "error" as const, title: "Payment not completed", body: "Your payment did not go through and you have not been charged. You can try again." },
    pending: { tone: "info" as const, title: "Payment processing", body: "Your bank is still confirming the payment. This page updates once it is complete." },
    refund_required: { tone: "warning" as const, title: "Payment received for a closed booking", body: "This booking was no longer active when your payment arrived. Our team will refund you in full." },
    paid: null,
  }[typeof payment === "string" && ["failed", "pending", "refund_required", "paid"].includes(payment) ? (payment as "failed" | "pending" | "refund_required" | "paid") : "paid"];

  return (
    <>
      <Link href="/account/bookings" className="text-[14px] font-semibold text-navy/70 hover:text-navy">
        Back to bookings
      </Link>
      <BookingHeader detail={detail} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <BookingSummary detail={detail} />
        <div className="order-first grid content-start gap-6 xl:order-none">
          {booking.status === "pending_vendor_acceptance" && (
            <Alert tone="info" title="Waiting for the vendor">
              {detail.vendorName} has until {formatDateTime(booking.responseDueAt)} to accept. The space on the truck is held for you until then.
            </Alert>
          )}
          {paymentNotice && (
            <Alert tone={paymentNotice.tone} title={paymentNotice.title}>
              {paymentNotice.body}
            </Alert>
          )}
          {booking.status === "awaiting_payment" &&
            (onlinePayments ? (
              <Card tone="attention">
                <CardHeader title={`Pay ${formatNaira(booking.totalKobo)} to confirm`} description="The vendor accepted your booking. Pay now to hold your space on the truck." />
                <PayButton bookingId={booking.id} label={`Pay ${formatNaira(booking.totalKobo)} now`} />
                <p className="mt-4 text-[13px] text-navy/70">
                  Prefer a direct bank transfer? Email{" "}
                  <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Payment for ${booking.reference}`)}`} className="font-semibold underline decoration-orange decoration-2 underline-offset-4">
                    {contactEmail}
                  </a>{" "}
                  quoting {booking.reference}.
                </p>
              </Card>
            ) : (
              <Alert tone="warning" title={`Pay ${formatNaira(booking.totalKobo)} to confirm`}>
                The vendor accepted your booking. Our team will contact you with payment details, or email{" "}
                <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Payment for ${booking.reference}`)}`} className="font-semibold underline decoration-orange decoration-2 underline-offset-4">
                  {contactEmail}
                </a>{" "}
                quoting {booking.reference}. Your booking is confirmed once payment is received.
              </Alert>
            ))}
          {booking.status === "confirmed" && (
            <Alert tone="success" title="Booking confirmed">
              Payment received. The vendor will contact you to arrange pickup. A confirmation has been emailed to you.
            </Alert>
          )}
          {(booking.status === "rejected" || booking.status === "expired" || booking.status === "cancelled") && (
            <Alert tone="info" title="This booking is closed">
              {booking.statusNote ?? "This booking is no longer active."}{" "}
              <Link href={`/account/shipments/${booking.shipmentId}`} className="font-semibold underline decoration-orange decoration-2 underline-offset-4">
                Choose another truck
              </Link>
            </Alert>
          )}
          {CUSTOMER_CANCELLABLE.includes(booking.status) && (
            <Card tone="danger">
              <CardHeader title="Cancel booking" description="Cancelling releases the space on the truck." />
              <ReasonActionForm
                action={customerCancelBookingAction.bind(null, booking.id)}
                trigger="Cancel booking"
                confirmLabel="Confirm cancellation"
                reasonLabel="Why are you cancelling?"
              />
            </Card>
          )}
          <BookingTimeline detail={detail} />
        </div>
      </div>
    </>
  );
}
