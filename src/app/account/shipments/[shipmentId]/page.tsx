import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, CardHeader, DescriptionList, EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BODY_TYPES, CARGO_TYPES, formatDate, formatKg, formatTransit, labelFor, SHIPMENT_STATUS, TRUCK_CATEGORIES } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { requireRole } from "@/server/auth/dal";
import { activeBookingForShipment, findCustomerShipment, searchOffers, SEARCH_WINDOW_DAYS } from "@/server/marketplace";
import { CancelShipmentButton, RequestOfferButton } from "./offer-actions";

export const metadata: Metadata = { title: "Shipment" };

export default async function ShipmentPage({ params }: PageProps<"/account/shipments/[shipmentId]">) {
  const { shipmentId } = await params;
  const user = await requireRole("customer");
  const shipment = /^[0-9a-f-]{36}$/i.test(shipmentId) ? await findCustomerShipment(user.id, shipmentId) : null;
  if (!shipment) {
    notFound();
  }
  const booking = shipment.status === "booked" ? await activeBookingForShipment(shipment.id) : null;
  const offers = shipment.status === "open" ? await searchOffers(shipment) : [];

  return (
    <>
      <Link href="/account/shipments" className="text-[14px] font-semibold text-navy/70 hover:text-navy">
        Back to shipments
      </Link>
      <PageHeader
        eyebrow={`${formatKg(shipment.weightKg)}, ${shipment.bookingType === "dedicated" ? "dedicated truck" : "shared load"}`}
        title={`${shipment.originCity} to ${shipment.destinationCity}`}
        action={<StatusBadge status={shipment.status} map={SHIPMENT_STATUS} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="grid content-start gap-4">
          {booking && (
            <Alert tone="success" title={`Booked as ${booking.reference}`}>
              <Link href={`/account/bookings/${booking.id}`} className="font-semibold underline decoration-orange decoration-2 underline-offset-4">
                View the booking
              </Link>
            </Alert>
          )}
          {shipment.status === "open" && (
            <>
              <h2 className="text-[19px] font-semibold text-navy">
                {offers.length === 0 ? "No matching trucks yet" : `${offers.length} matching truck${offers.length === 1 ? "" : "s"}`}
              </h2>
              {offers.length === 0 ? (
                <EmptyState
                  title="No trips yet"
                  description={`No verified truck is going from ${shipment.originState} to ${shipment.destinationState} between ${formatDate(shipment.pickupDate)} and ${SEARCH_WINDOW_DAYS} days after with room for your load. New trips are added every day, so check back soon.`}
                />
              ) : (
                <ul className="grid gap-4">
                  {offers.map((offer) => (
                    <li key={offer.route.id} className="grid gap-5 rounded-[24px] border border-navy/10 bg-white p-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
                      <div>
                        <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-navy/70">Departs {formatDate(offer.route.departureDate)}</p>
                        <p className="mt-1 text-[18px] font-semibold text-navy">
                          {offer.route.originCity} to {offer.route.destinationCity}
                        </p>
                        <p className="mt-1 text-[14px] text-navy/70">
                          {offer.vendorName}, verified vendor. {labelFor(TRUCK_CATEGORIES, offer.truck.category)}, {labelFor(BODY_TYPES, offer.truck.bodyType).toLowerCase()}.
                          About {formatTransit(offer.route.transitHours)} in transit. {formatKg(offer.remainingKg)} available.
                        </p>
                        <ul className="mt-3 grid gap-1 text-[13px] text-navy/70">
                          {offer.quote.lineItems.map((item) => (
                            <li key={item.label} className="flex justify-between gap-4">
                              <span>{item.label}</span>
                              <span>{formatNaira(item.amountKobo)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="grid gap-3 lg:justify-items-end">
                        <p className="font-display text-[36px] leading-none text-navy">{formatNaira(offer.quote.totalKobo)}</p>
                        <RequestOfferButton
                          shipmentId={shipment.id}
                          routeId={offer.route.id}
                          label={`Request booking with ${offer.vendorName} departing ${formatDate(offer.route.departureDate)} for ${formatNaira(offer.quote.totalKobo)}`}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Shipment details" />
            <DescriptionList
              items={[
                { label: "Cargo", value: labelFor(CARGO_TYPES, shipment.cargoType) },
                { label: "Description", value: shipment.description },
                { label: "Packages", value: shipment.packageCount },
                { label: "Pickup date", value: formatDate(shipment.pickupDate) },
                { label: "From", value: `${shipment.originAddress}, ${shipment.originCity}, ${shipment.originState}` },
                { label: "To", value: `${shipment.destinationAddress}, ${shipment.destinationCity}, ${shipment.destinationState}` },
              ]}
            />
          </Card>
          {shipment.status === "open" && (
            <Card>
              <CardHeader title="Change of plans?" description="Cancel this shipment if you no longer need a truck." />
              <div className="flex flex-wrap gap-3">
                <Link href="/account/shipments/new" className={buttonClasses("outline", "sm")}>
                  Start a new shipment
                </Link>
                <CancelShipmentButton shipmentId={shipment.id} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
