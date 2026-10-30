import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatKg, formatTransit, ROUTE_STATUS } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { requireRole } from "@/server/auth/dal";
import { listRoutesForVendor } from "@/server/marketplace";
import { findVendorProfileByUser } from "@/server/vendors";
import { RouteStatusForm } from "./route-status-form";

export const metadata: Metadata = { title: "Trips" };

export default async function VendorRoutesPage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  const routes = profile ? await listRoutesForVendor(profile.id) : [];
  const schedule = (
    <Link href="/vendor/routes/new" className={buttonClasses("primary")}>
      Schedule a trip
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Trips"
        description="Each trip is a truck making a journey on a date. Shippers book the space you offer, and bookings reserve capacity automatically."
        action={routes.length > 0 ? schedule : undefined}
      />
      {routes.length === 0 ? (
        <EmptyState title="No trips yet" description="Publish the journeys your trucks are making so shippers on the same route can book space." action={schedule} />
      ) : (
        <ul className="grid gap-4">
          {routes.map(({ route, registrationNumber }) => {
            const usedPercent = Math.round((route.reservedKg / route.capacityKg) * 100);
            const editable = route.status === "active" || route.status === "paused";
            return (
              <li key={route.id} className="grid gap-5 rounded-lg border border-navy/10 bg-white p-6 lg:grid-cols-[1.4fr_1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-display text-[26px] uppercase leading-none text-navy">
                      {route.originCity} <span className="text-orange-deep">to</span> {route.destinationCity}
                    </p>
                    <StatusBadge status={route.status} map={ROUTE_STATUS} />
                  </div>
                  <p className="mt-2 text-[14px] text-navy/70">
                    {route.originState} to {route.destinationState}. Departs {formatDate(route.departureDate)}, about {formatTransit(route.transitHours)}. Truck {registrationNumber}.
                  </p>
                  <p className="mt-1 text-[14px] text-navy/70">
                    {formatNaira(route.ratePerTonneKobo)} per tonne
                    {route.minimumChargeKobo > 0 && `, minimum ${formatNaira(route.minimumChargeKobo)}`}
                    {route.dedicatedPriceKobo && `, whole truck ${formatNaira(route.dedicatedPriceKobo)}`}
                    {!route.allowsShared && ", whole truck only"}
                    {route.loadingChargeKobo > 0 && `, loading ${formatNaira(route.loadingChargeKobo)}`}
                    {route.offloadingChargeKobo > 0 && `, offloading ${formatNaira(route.offloadingChargeKobo)}`}
                    {route.tollChargeKobo > 0 && `, tolls ${formatNaira(route.tollChargeKobo)}`}
                  </p>
                </div>
                <div>
                  <div className="flex justify-between text-[13px] text-navy/70">
                    <span>Booked {formatKg(route.reservedKg)}</span>
                    <span>of {formatKg(route.capacityKg)}</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-navy/10" role="img" aria-label={`${usedPercent}% of capacity booked`}>
                    <div className="h-full rounded-full bg-orange" style={{ width: `${usedPercent}%` }} />
                  </div>
                </div>
                {editable ? <RouteStatusForm routeId={route.id} status={route.status} /> : <span />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
