import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { driverDeliveryUpdateAction } from "@/app/driver/actions";
import { DeliveryTimeline } from "@/components/delivery/delivery-timeline";
import { DeliveryUpdateForm } from "@/components/delivery/delivery-update-form";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader, DescriptionList } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { availableUpdates } from "@/lib/delivery";
import { BOOKING_STATUS, DELIVERY_ACTIONS, formatDate, formatKg, formatTransit, labelFor } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { requireRole } from "@/server/auth/dal";
import { listDeliveryEvents } from "@/server/delivery";
import { activeDriverFor } from "@/server/drivers";
import { getBookingDetail } from "@/server/marketplace";
import { InactiveDriverNotice } from "../../inactive-notice";

export const metadata: Metadata = { title: "Delivery" };

export default async function DriverDeliveryPage({ params }: PageProps<"/driver/deliveries/[bookingId]">) {
  const { bookingId } = await params;
  const user = await requireRole("driver");
  const session = await activeDriverFor(user.id);
  if (!session) {
    return <InactiveDriverNotice />;
  }
  const detail = /^[0-9a-f-]{36}$/i.test(bookingId) ? await getBookingDetail(bookingId) : null;
  if (!detail || detail.booking.driverId !== session.driver.id) {
    notFound();
  }
  const { booking, shipment, route, truck } = detail;
  const rows = await listDeliveryEvents(booking.id);
  const updates = availableUpdates(booking.status, rows.map((row) => row.event.kind));

  return (
    <>
      <Link href="/driver" className="text-[14px] font-semibold text-navy/70 hover:text-navy">
        Back to deliveries
      </Link>
      <header className="mb-8 mt-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-orange-ink">Delivery</p>
        <h1 className="mt-2 font-display text-[clamp(34px,4vw,56px)] uppercase leading-[0.95] text-navy">{booking.reference}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[14px] text-navy/70">
          <StatusBadge status={booking.status} map={BOOKING_STATUS} />
          <span>
            {shipment.originCity} to {shipment.destinationCity}, departs {formatDate(route.departureDate)}
          </span>
        </div>
      </header>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Pickup" />
            <DescriptionList
              items={[
                { label: "Address", value: `${shipment.originAddress}, ${shipment.originCity}, ${shipment.originState}` },
                { label: "Requested date", value: formatDate(shipment.pickupDate) },
                { label: "Shipper", value: detail.customerName },
                { label: "Shipper's phone", value: <a href={`tel:${detail.customerPhone ?? ""}`} className="underline decoration-orange decoration-2 underline-offset-4">{formatPhone(detail.customerPhone)}</a> },
              ]}
            />
          </Card>
          <Card>
            <CardHeader title="Delivery" />
            <DescriptionList
              items={[
                { label: "Address", value: `${shipment.destinationAddress}, ${shipment.destinationCity}, ${shipment.destinationState}` },
                { label: "Expected transit", value: formatTransit(route.transitHours) },
              ]}
            />
          </Card>
          <Card>
            <CardHeader title="Cargo" />
            <DescriptionList
              items={[
                { label: "Type", value: detail.cargoLabel ?? labelFor([], shipment.cargoType) },
                { label: "Description", value: shipment.description },
                { label: "Weight", value: formatKg(shipment.weightKg) },
                { label: "Packages", value: shipment.packageCount },
                { label: "Truck", value: truck.registrationNumber },
                ...(shipment.handlingNotes ? [{ label: "Handling notes", value: shipment.handlingNotes }] : []),
              ]}
            />
          </Card>
        </div>
        <div className="order-first grid content-start gap-6 xl:order-none">
          {updates.length > 0 ? (
            <Card tone="attention">
              <CardHeader title="Record an update" description="The shipper is emailed when goods are collected, on the road and delivered." />
              <DeliveryUpdateForm action={driverDeliveryUpdateAction.bind(null, booking.id)} options={updates.map((kind) => ({ value: kind, ...DELIVERY_ACTIONS[kind] }))} />
            </Card>
          ) : booking.status === "delivered" || booking.status === "completed" ? (
            <Alert tone="success" title="Delivery complete">
              Thank you. This delivery is finished.
            </Alert>
          ) : (
            <Alert tone="info" title="No updates needed">
              This booking is {BOOKING_STATUS[booking.status]?.label.toLowerCase() ?? booking.status}.
            </Alert>
          )}
          <DeliveryTimeline rows={rows} />
        </div>
      </div>
    </>
  );
}
