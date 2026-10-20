import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, PAYOUT_STATUS } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { requireRole } from "@/server/auth/dal";
import { listPayouts } from "@/server/payments";
import { findVendorProfileByUser } from "@/server/vendors";

export const metadata: Metadata = { title: "Earnings" };

export default async function VendorPayoutsPage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  const rows = profile ? await listPayouts({ vendorId: profile.id }) : [];
  const pending = rows.filter((row) => row.payout.status === "on_hold" || row.payout.status === "eligible").reduce((sum, row) => sum + row.payout.amountKobo, 0);
  const paid = rows.filter((row) => row.payout.status === "paid").reduce((sum, row) => sum + row.payout.amountKobo, 0);

  return (
    <>
      <PageHeader eyebrow="Finance" title="Earnings" description="Your share of each paid booking, after the platform commission. We pay out once delivery is confirmed." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-[13px] font-semibold text-navy/70">Awaiting payout</p>
          <p className="mt-2 font-display text-[40px] leading-none text-navy">{formatNaira(pending)}</p>
        </Card>
        <Card tone="dark">
          <p className="text-[13px] font-semibold text-white/70">Paid to you</p>
          <p className="mt-2 font-display text-[40px] leading-none">{formatNaira(paid)}</p>
        </Card>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No earnings yet" description="When shippers pay for bookings on your trips, your share appears here." />
      ) : (
        <ul className="grid gap-3">
          {rows.map(({ payout, bookingReference }) => (
            <li key={payout.id} className="flex flex-col gap-3 rounded-[20px] border border-navy/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href={`/vendor/bookings/${payout.bookingId}`} className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
                  {bookingReference}
                </Link>
                <p className="mt-1 text-[14px] text-navy/70">
                  {payout.paidAt ? `Paid ${formatDateTime(payout.paidAt)}, reference ${payout.transferReference}` : `Created ${formatDateTime(payout.createdAt)}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[18px] font-semibold text-navy">{formatNaira(payout.amountKobo)}</span>
                <StatusBadge status={payout.status} map={PAYOUT_STATUS} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
