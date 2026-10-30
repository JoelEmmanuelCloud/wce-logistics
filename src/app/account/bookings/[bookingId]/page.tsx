import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/line-icons";
import { notFound } from "next/navigation";
import { confirmReceiptAction, submitReviewAction } from "@/app/account/bookings/actions";
import { customerCancelBookingAction } from "@/app/account/shipments/actions";
import { DeliveryTimeline } from "@/components/delivery/delivery-timeline";
import { BookingHeader, BookingSummary, BookingTimeline } from "@/components/marketplace/booking-detail";
import { ReasonActionForm } from "@/components/marketplace/reason-action-form";
import { ReviewForm } from "@/components/reviews/review-form";
import { Stars } from "@/components/reviews/star-rating";
import { ActionButton } from "@/components/ui/action-button";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, CardHeader, DescriptionList } from "@/components/ui/card";
import { PhoneLink } from "@/components/ui/contact-link";
import { formatDateTime } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { site } from "@/lib/site";
import { requireRole } from "@/server/auth/dal";
import { listDeliveryEvents } from "@/server/delivery";
import { ACTIVE_DISPUTE_STATUSES, canOpenDispute, latestDisputeForBooking } from "@/server/disputes";
import { CUSTOMER_CANCELLABLE, getBookingDetail } from "@/server/marketplace";
import { paystackConfigured } from "@/server/paystack";
import { reviewForBooking } from "@/server/reviews";
import { getPlatformSettings } from "@/server/settings";
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
  const [deliveryRows, review, dispute, disputable, settings] = await Promise.all([
    listDeliveryEvents(booking.id),
    reviewForBooking(booking.id),
    latestDisputeForBooking(booking.id),
    canOpenDispute(booking),
    getPlatformSettings(),
  ]);
  const activeDispute = dispute && ACTIVE_DISPUTE_STATUSES.includes(dispute.status) ? dispute : null;
  const canDispute = !activeDispute && disputable;
  const driverVisible = Boolean(detail.driverName) && ["pickup_scheduled", "goods_collected", "in_transit", "delivery_attempted", "delivered"].includes(booking.status);
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
      <Link href="/account/bookings" className="group inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
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
              Payment received. The vendor will assign a driver and contact you to arrange pickup. A confirmation has been emailed to you.
            </Alert>
          )}
          {activeDispute && (
            <Alert tone="warning" title="Dispute open">
              Our team is reviewing the problem you reported.{" "}
              <Link href={`/account/bookings/${booking.id}/dispute`} className="font-semibold underline decoration-orange decoration-2 underline-offset-4">
                View dispute
              </Link>
            </Alert>
          )}
          {booking.status === "delivered" && (
            <Card tone="attention">
              <CardHeader
                title="Did everything arrive safely?"
                description={`Confirm receipt to complete the booking. If you do nothing, it completes automatically ${settings.autoCompleteHours} hours after delivery.`}
              />
              <div className="grid gap-3">
                <ActionButton action={confirmReceiptAction.bind(null, booking.id)} label="Confirm receipt" pendingLabel="Confirming" />
                {canDispute && (
                  <Link href={`/account/bookings/${booking.id}/dispute`} className={buttonClasses("outline")}>
                    Report a problem
                  </Link>
                )}
              </div>
            </Card>
          )}
          {driverVisible && (
            <Card>
              <CardHeader title="Your driver" />
              <DescriptionList
                items={[
                  { label: "Name", value: detail.driverName },
                  { label: "Phone", value: <PhoneLink phone={detail.driverPhone} /> },
                ]}
              />
            </Card>
          )}
          {booking.status === "completed" &&
            (review ? (
              <Card>
                <CardHeader title="Your review" />
                <div className="grid gap-2">
                  <span className="inline-flex items-center gap-2 text-[14px] text-navy">
                    <Stars value={review.rating} /> {review.rating} out of 5
                  </span>
                  {review.comment && <p className="text-[15px] text-navy/80">{review.comment}</p>}
                </div>
              </Card>
            ) : (
              <Card tone="attention">
                <CardHeader title="Rate this delivery" description="Your review helps other shippers choose reliable vendors." />
                <ReviewForm action={submitReviewAction.bind(null, booking.id)} />
              </Card>
            ))}
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
          {(booking.driverId || deliveryRows.length > 0) && <DeliveryTimeline rows={deliveryRows} />}
          {canDispute && booking.status !== "delivered" && (
            <Card>
              <CardHeader title="Something wrong?" description="Report a problem with this booking. Our team reviews every dispute." />
              <Link href={`/account/bookings/${booking.id}/dispute`} className={buttonClasses("outline")}>
                Report a problem
              </Link>
            </Card>
          )}
          {dispute && !activeDispute && (
            <Link href={`/account/bookings/${booking.id}/dispute`} className="text-[14px] font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
              View the closed dispute
            </Link>
          )}
          <BookingTimeline detail={detail} />
        </div>
      </div>
    </>
  );
}
