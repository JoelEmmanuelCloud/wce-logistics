import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BOOKING_STATUS, formatDate, formatKg } from "@/lib/labels";
import { requireRole } from "@/server/auth/dal";
import { listDriverDeliveries } from "@/server/delivery";
import { activeDriverFor } from "@/server/drivers";
import { InactiveDriverNotice } from "./inactive-notice";

export const metadata: Metadata = { title: "Deliveries" };

type Delivery = Awaited<ReturnType<typeof listDriverDeliveries>>[number];

function DeliveryCard({ delivery }: { delivery: Delivery }) {
  return (
    <Link
      href={`/driver/deliveries/${delivery.booking.id}`}
      className="flex h-full flex-col gap-4 rounded-[24px] border border-navy/10 bg-white p-6 transition-colors hover:border-navy/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-[24px] uppercase leading-none text-navy">{delivery.booking.reference}</p>
        <StatusBadge status={delivery.booking.status} map={BOOKING_STATUS} />
      </div>
      <p className="text-[17px] font-semibold text-navy">
        {delivery.originCity} to {delivery.destinationCity}
      </p>
      <dl className="grid grid-cols-2 gap-3 border-t border-navy/10 pt-4 text-[13px]">
        <div>
          <dt className="text-navy/70">Departs</dt>
          <dd className="mt-0.5 font-semibold text-navy">{formatDate(delivery.departureDate)}</dd>
        </div>
        <div>
          <dt className="text-navy/70">Truck</dt>
          <dd className="mt-0.5 font-semibold text-navy">{delivery.registrationNumber}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-navy/70">Pickup</dt>
          <dd className="mt-0.5 font-semibold text-navy">
            {delivery.originAddress}, {delivery.originCity}. {formatKg(delivery.weightKg)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}

export default async function DriverHomePage() {
  const user = await requireRole("driver");
  const session = await activeDriverFor(user.id);
  if (!session) {
    return <InactiveDriverNotice />;
  }
  const [active, past] = await Promise.all([listDriverDeliveries(session.driver.id, "active"), listDriverDeliveries(session.driver.id, "past")]);
  const firstName = session.driver.fullName.split(" ")[0];

  return (
    <>
      <PageHeader eyebrow={`Driving for ${session.vendorName}`} title={`Hello, ${firstName}`} description="Your assigned deliveries. Record each step so the shipper can follow the shipment." />
      <section aria-labelledby="active-title" className="grid gap-4">
        <h2 id="active-title" className="text-[19px] font-semibold text-navy">
          Current deliveries
        </h2>
        {active.length === 0 ? (
          <EmptyState title="No deliveries right now" description="When your vendor assigns you to a booking, it appears here and we email you." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {active.map((delivery) => (
              <li key={delivery.booking.id}>
                <DeliveryCard delivery={delivery} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {past.length > 0 && (
        <section aria-labelledby="past-title" className="mt-10 grid gap-4">
          <h2 id="past-title" className="text-[19px] font-semibold text-navy">
            Recent deliveries
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {past.map((delivery) => (
              <li key={delivery.booking.id}>
                <DeliveryCard delivery={delivery} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
