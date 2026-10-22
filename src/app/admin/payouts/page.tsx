import type { Metadata } from "next";
import Link from "next/link";
import { markPayoutPaidAction } from "@/app/admin/payments/actions";
import { DataTable } from "@/components/admin/list-controls";
import { ReasonActionForm } from "@/components/marketplace/reason-action-form";
import { PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BOOKING_STATUS, formatDateTime, PAYOUT_STATUS } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { requireRole } from "@/server/auth/dal";
import { listPayouts } from "@/server/payments";

export const metadata: Metadata = { title: "Payouts" };

export default async function AdminPayoutsPage() {
  await requireRole("admin");
  const rows = await listPayouts();
  const outstanding = rows.filter((row) => row.payout.status === "on_hold" || row.payout.status === "eligible").reduce((sum, row) => sum + row.payout.amountKobo, 0);

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Vendor payouts"
        description="Each paid booking creates a payout of the vendor's share. Pay vendors once delivery is confirmed, then record the transfer reference."
        action={
          <div className="rounded-2xl bg-white px-5 py-3 text-right">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-navy/70">Outstanding</p>
            <p className="font-display text-[30px] leading-none text-navy">{formatNaira(outstanding)}</p>
          </div>
        }
      />
      <DataTable caption="Vendor payouts" headers={["Booking", "Vendor", "Amount", "Booking status", "Payout", ""]}>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-10 text-center text-navy/70">
              No payouts yet.
            </td>
          </tr>
        ) : (
          rows.map(({ payout, bookingReference, bookingStatus, vendorName }) => (
            <tr key={payout.id} className="align-top hover:bg-navy/[0.02]">
              <td className="px-4 py-3">
                <Link href={`/admin/bookings/${payout.bookingId}`} className="font-semibold text-navy underline-offset-4 hover:underline">
                  {bookingReference}
                </Link>
              </td>
              <td className="px-4 py-3 text-navy">{vendorName}</td>
              <td className="px-4 py-3 whitespace-nowrap font-semibold text-navy">{formatNaira(payout.amountKobo)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={bookingStatus} map={BOOKING_STATUS} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={payout.status} map={PAYOUT_STATUS} />
                {payout.paidAt && (
                  <span className="mt-1 block text-[12px] text-navy/70">
                    {formatDateTime(payout.paidAt)}, ref {payout.transferReference}
                  </span>
                )}
                {payout.note && <span className="mt-1 block max-w-[240px] text-[12px] text-navy/70">{payout.note}</span>}
              </td>
              <td className="px-4 py-3">
                {payout.status === "eligible" && (
                  <ReasonActionForm
                    action={markPayoutPaidAction.bind(null, payout.id)}
                    trigger="Mark paid"
                    triggerVariant="secondary"
                    variant="secondary"
                    confirmLabel="Confirm payout"
                    reasonLabel="Bank transfer reference"
                  />
                )}
              </td>
            </tr>
          ))
        )}
      </DataTable>
    </>
  );
}
