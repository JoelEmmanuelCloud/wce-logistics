import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { BOOKING_STATUS, formatDate, formatKg } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import type { listBookings } from "@/server/marketplace";

type Row = Awaited<ReturnType<typeof listBookings>>[number];

export function BookingList({ rows, hrefFor, counterparty }: { rows: Row[]; hrefFor: (id: string) => string; counterparty: "vendor" | "customer" | "both" }) {
  return (
    <ul className="grid gap-3">
      {rows.map((row) => (
        <li key={row.booking.id}>
          <Link
            href={hrefFor(row.booking.id)}
            className="grid gap-3 rounded-[20px] border border-navy/10 bg-white p-5 transition-colors hover:border-navy/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange md:grid-cols-[1.3fr_1fr_auto] md:items-center"
          >
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-navy/70">{row.booking.reference}</p>
              <p className="mt-1 text-[17px] font-semibold text-navy">
                {row.originCity}, {row.originState} to {row.destinationCity}, {row.destinationState}
              </p>
              <p className="mt-1 text-[14px] text-navy/70">
                Departs {formatDate(row.departureDate)}, {formatKg(row.weightKg)}, truck {row.registrationNumber}
              </p>
            </div>
            <div className="text-[14px] text-navy/70">
              {(counterparty === "vendor" || counterparty === "both") && <p>Vendor: {row.vendorName}</p>}
              {(counterparty === "customer" || counterparty === "both") && <p>Shipper: {row.customerName ?? "Not set"}</p>}
              <p className="mt-1 text-[16px] font-semibold text-navy">{formatNaira(row.booking.totalKobo)}</p>
            </div>
            <StatusBadge status={row.booking.status} map={BOOKING_STATUS} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
