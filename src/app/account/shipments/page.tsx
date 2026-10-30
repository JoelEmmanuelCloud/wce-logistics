import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatKg, SHIPMENT_STATUS } from "@/lib/labels";
import { requireRole } from "@/server/auth/dal";
import { listShipmentsForCustomer } from "@/server/marketplace";

export const metadata: Metadata = { title: "Shipments" };

export default async function ShipmentsPage() {
  const user = await requireRole("customer");
  const shipments = await listShipmentsForCustomer(user.id);
  const start = (
    <Link href="/account/shipments/new" className={buttonClasses("primary")}>
      Send a shipment
    </Link>
  );

  return (
    <>
      <PageHeader title="Shipments" description="Every load you have asked us to move, and the trucks matched to it." action={shipments.length > 0 ? start : undefined} />
      {shipments.length === 0 ? (
        <EmptyState title="No shipments yet" description="Describe your load and we will show verified trucks making that trip, with the full price before you commit." action={start} />
      ) : (
        <ul className="grid gap-3">
          {shipments.map((shipment) => (
            <li key={shipment.id}>
              <Link
                href={`/account/shipments/${shipment.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-navy/10 bg-white p-5 transition-colors hover:border-navy/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-[17px] font-semibold text-navy">
                    {shipment.originCity}, {shipment.originState} to {shipment.destinationCity}, {shipment.destinationState}
                  </p>
                  <p className="mt-1 text-[14px] text-navy/70">
                    {shipment.description}. {formatKg(shipment.weightKg)}, pickup {formatDate(shipment.pickupDate)}.
                  </p>
                </div>
                <StatusBadge status={shipment.status} map={SHIPMENT_STATUS} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
