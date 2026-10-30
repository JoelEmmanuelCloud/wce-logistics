import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/line-icons";
import { notFound, redirect } from "next/navigation";
import { assignDriverAction, declineBookingAction, vendorCancelBookingAction, vendorDeliveryUpdateAction } from "@/app/vendor/bookings/actions";
import { AssignDriverForm } from "@/components/delivery/assign-driver-form";
import { DeliveryTimeline } from "@/components/delivery/delivery-timeline";
import { DeliveryUpdateForm } from "@/components/delivery/delivery-update-form";
import { BookingHeader, BookingSummary, BookingTimeline } from "@/components/marketplace/booking-detail";
import { ReasonActionForm } from "@/components/marketplace/reason-action-form";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, CardHeader, DescriptionList } from "@/components/ui/card";
import { PhoneLink } from "@/components/ui/contact-link";
import { ASSIGNABLE_STATUSES, availableUpdates } from "@/lib/delivery";
import { DELIVERY_ACTIONS, formatDateTime } from "@/lib/labels";
import { requireRole } from "@/server/auth/dal";
import { driverOptions, listDeliveryEvents } from "@/server/delivery";
import { ACTIVE_DISPUTE_STATUSES, canOpenDispute, latestDisputeForBooking } from "@/server/disputes";
import { getBookingDetail, VENDOR_CANCELLABLE } from "@/server/marketplace";
import { getPlatformSettings } from "@/server/settings";
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
  const cancellable = VENDOR_CANCELLABLE.includes(booking.status);
  const assignable = ASSIGNABLE_STATUSES.includes(booking.status);
  const [deliveryRows, drivers, dispute, disputable, settings] = await Promise.all([
    listDeliveryEvents(booking.id),
    assignable ? driverOptions(profile.id, detail.truck.category, detail.route.departureDate) : Promise.resolve([]),
    latestDisputeForBooking(booking.id),
    canOpenDispute(booking),
    getPlatformSettings(),
  ]);
  const activeDispute = dispute && ACTIVE_DISPUTE_STATUSES.includes(dispute.status) ? dispute : null;
  const updates = booking.driverId ? availableUpdates(booking.status, deliveryRows.map((row) => row.event.kind)) : [];

  return (
    <>
      <Link href="/vendor/bookings" className="group inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
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
          {activeDispute && (
            <Alert tone="warning" title="Dispute open">
              The payout for this booking is on hold until our team resolves the dispute.{" "}
              <Link href={`/vendor/bookings/${booking.id}/dispute`} className="font-semibold underline decoration-orange decoration-2 underline-offset-4">
                View dispute
              </Link>
            </Alert>
          )}
          {assignable && (
            <Card tone={booking.driverId ? "light" : "attention"}>
              <CardHeader
                title={booking.driverId ? "Driver" : "Assign a driver"}
                description={
                  booking.driverId
                    ? <>{detail.driverName}, <PhoneLink phone={detail.driverPhone} />. You can change the driver until the goods are collected.</>
                    : "The shipper sees the driver's name and phone number once you assign one."
                }
              />
              {drivers.length === 0 && !booking.driverId ? (
                <Link href="/vendor/drivers/new" className={buttonClasses("secondary")}>
                  Add a driver
                </Link>
              ) : (
                <AssignDriverForm action={assignDriverAction.bind(null, booking.id)} drivers={drivers} currentDriverId={booking.driverId} />
              )}
            </Card>
          )}
          {!assignable && detail.driverName && (
            <Card>
              <CardHeader title="Driver" />
              <DescriptionList
                items={[
                  { label: "Name", value: detail.driverName },
                  { label: "Phone", value: <PhoneLink phone={detail.driverPhone} /> },
                ]}
              />
            </Card>
          )}
          {updates.length > 0 && (
            <Card>
              <CardHeader title="Update delivery" description="Your driver usually records these from their phone. You can record them here too." />
              <DeliveryUpdateForm
                action={vendorDeliveryUpdateAction.bind(null, booking.id)}
                options={updates.map((kind) => ({ value: kind, ...DELIVERY_ACTIONS[kind] }))}
              />
            </Card>
          )}
          {booking.status === "delivered" && (
            <Alert tone="info" title="Waiting for the shipper">
              The booking completes when the shipper confirms receipt, or automatically {settings.autoCompleteHours} hours after delivery if no problem is reported.
            </Alert>
          )}
          {CONTACT_VISIBLE.includes(booking.status) && (
            <Card>
              <CardHeader title="Shipper" />
              <DescriptionList
                items={[
                  { label: "Name", value: detail.customerName },
                  { label: "Phone", value: <PhoneLink phone={detail.customerPhone} /> },
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
          {(booking.driverId || deliveryRows.length > 0) && <DeliveryTimeline rows={deliveryRows} />}
          {!activeDispute && (disputable || dispute) && (
            <Link href={`/vendor/bookings/${booking.id}/dispute`} className="text-[14px] font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
              {disputable ? "Report a problem with this booking" : "View the closed dispute"}
            </Link>
          )}
          <BookingTimeline detail={detail} />
        </div>
      </div>
    </>
  );
}
