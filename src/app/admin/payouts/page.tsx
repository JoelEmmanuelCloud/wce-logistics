import type { Metadata } from "next";
import Link from "next/link";
import { markPayoutPaidAction, payWithPaystackAction } from "@/app/admin/payments/actions";
import { DataTable } from "@/components/admin/list-controls";
import { ReasonActionForm } from "@/components/marketplace/reason-action-form";
import { PageHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { BOOKING_STATUS, formatDateTime, PAYOUT_STATUS } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { requireRole } from "@/server/auth/dal";
import { listPayouts } from "@/server/payments";
import { paystackConfigured } from "@/server/paystack";

export const metadata: Metadata = { title: "Payouts" };

const OUTSTANDING = ["on_hold", "eligible", "processing"];

export default async function AdminPayoutsPage() {
  await requireRole("admin");
  const rows = await listPayouts();
  const outstanding = rows.filter((row) => OUTSTANDING.includes(row.payout.status)).reduce((sum, row) => sum + row.payout.amountKobo, 0);
  const transfers = paystackConfigured();

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Vendor payouts"
        description="Each paid booking creates a payout of the vendor's share. It becomes ready to pay when the booking is completed and no dispute is open."
        action={
          <div className="rounded-lg bg-white px-5 py-3 text-right">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-navy/70">Outstanding</p>
            <p className="font-display text-[30px] leading-none text-navy">{formatNaira(outstanding)}</p>
          </div>
        }
      />
      <DataTable caption="Vendor payouts" headers={["Booking", "Vendor and bank account", "Amount", "Booking status", "Payout", ""]}>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-10 text-center text-navy/70">
              No payouts yet.
            </td>
          </tr>
        ) : (
          rows.map(({ payout, bookingReference, bookingStatus, vendorName, account }) => (
            <tr key={payout.id} className="align-top hover:bg-navy/[0.02]">
              <td className="px-4 py-3">
                <Link href={`/admin/bookings/${payout.bookingId}`} className="font-semibold text-navy underline-offset-4 hover:underline">
                  {bookingReference}
                </Link>
              </td>
              <td className="px-4 py-3 text-navy">
                {vendorName}
                <span className="mt-1 block max-w-[260px] text-[12px] text-navy/70">
                  {account?.bankName ? `${account.bankName}, ending ${account.accountNumberLast4}, ${account.accountName}` : "No bank account yet"}
                </span>
              </td>
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
                {payout.failureReason && <span className="mt-1 block max-w-[240px] text-[12px] text-[#B42318]">{payout.failureReason}</span>}
                {payout.note && <span className="mt-1 block max-w-[240px] text-[12px] text-navy/70">{payout.note}</span>}
              </td>
              <td className="px-4 py-3">
                <div className="grid gap-2">
                  {payout.status === "eligible" && transfers && account?.bankName && (
                    <ConfirmActionButton
                      action={payWithPaystackAction.bind(null, payout.id)}
                      trigger="Pay with Paystack"
                      question={`Send ${formatNaira(payout.amountKobo)} to ${account.bankName}, ending ${account.accountNumberLast4}?`}
                      confirmLabel="Send transfer"
                      pendingLabel="Sending"
                    />
                  )}
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
                </div>
              </td>
            </tr>
          ))
        )}
      </DataTable>
    </>
  );
}
