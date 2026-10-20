import type { ReactNode } from "react";
import { Card, CardHeader, DescriptionList } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BOOKING_STATUS, CARGO_TYPES, formatDate, formatDateTime, formatKg, formatTransit, labelFor, TRUCK_CATEGORIES } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import type { getBookingDetail } from "@/server/marketplace";

type Detail = NonNullable<Awaited<ReturnType<typeof getBookingDetail>>>;

export function BookingSummary({ detail }: { detail: Detail }) {
  const { booking, shipment, route, truck } = detail;
  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-display text-[clamp(30px,3.4vw,44px)] uppercase leading-[0.95] text-navy">
              {shipment.originCity} <span className="text-orange-deep">to</span> {shipment.destinationCity}
            </p>
            <p className="mt-2 text-[15px] text-navy/70">
              {shipment.originState} to {shipment.destinationState}. Departs {formatDate(route.departureDate)}, about {formatTransit(route.transitHours)} in transit.
            </p>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-navy/70">Total</p>
            <p className="font-display text-[40px] leading-none text-navy">{formatNaira(booking.totalKobo)}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Shipment" />
          <DescriptionList
            items={[
              { label: "Cargo", value: labelFor(CARGO_TYPES, shipment.cargoType) },
              { label: "Description", value: shipment.description },
              { label: "Weight", value: formatKg(shipment.weightKg) },
              { label: "Packages", value: shipment.packageCount },
              { label: "Pickup address", value: `${shipment.originAddress}, ${shipment.originCity}` },
              { label: "Delivery address", value: `${shipment.destinationAddress}, ${shipment.destinationCity}` },
              { label: "Requested pickup", value: formatDate(shipment.pickupDate) },
              { label: "Booking type", value: booking.type === "dedicated" ? "Dedicated truck" : "Shared load" },
              ...(shipment.handlingNotes ? [{ label: "Handling notes", value: shipment.handlingNotes }] : []),
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Price breakdown" description="Fixed when the booking was requested." />
          <dl className="grid gap-3">
            {booking.lineItems.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-6 text-[15px]">
                <dt className="text-navy/80">{item.label}</dt>
                <dd className="whitespace-nowrap font-semibold text-navy">{formatNaira(item.amountKobo)}</dd>
              </div>
            ))}
            <div className="flex items-start justify-between gap-6 border-t border-navy/10 pt-3 text-[16px]">
              <dt className="font-semibold text-navy">Total</dt>
              <dd className="whitespace-nowrap font-semibold text-navy">{formatNaira(booking.totalKobo)}</dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-navy/10 pt-5">
            <DescriptionList
              items={[
                { label: "Truck", value: `${truck.registrationNumber}, ${labelFor(TRUCK_CATEGORIES, truck.category)}` },
                { label: "Vendor", value: detail.vendorName },
              ]}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

export function BookingTimeline({ detail }: { detail: Detail }) {
  return (
    <Card>
      <CardHeader title="Timeline" />
      <ol className="grid gap-4">
        {detail.events.map((event) => (
          <li key={event.id} className="relative border-l-2 border-navy/10 pl-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={event.status} map={BOOKING_STATUS} />
              <span className="text-[13px] text-navy/70">{formatDateTime(event.createdAt)}</span>
            </div>
            {event.note && <p className="mt-1 text-[14px] text-navy/80">{event.note}</p>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function BookingHeader({ detail, action }: { detail: Detail; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-orange-ink">Booking</p>
        <h1 className="mt-2 font-display text-[clamp(34px,4vw,56px)] uppercase leading-[0.95] text-navy">{detail.booking.reference}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[14px] text-navy/70">
          <StatusBadge status={detail.booking.status} map={BOOKING_STATUS} />
          <span>Requested {formatDateTime(detail.booking.createdAt)}</span>
        </div>
      </div>
      {action}
    </header>
  );
}
