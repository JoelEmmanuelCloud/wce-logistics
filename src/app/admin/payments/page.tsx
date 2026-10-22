import type { Metadata } from "next";
import Link from "next/link";
import { refundPaymentAction } from "@/app/admin/payments/actions";
import { DataTable } from "@/components/admin/list-controls";
import { ReasonActionForm } from "@/components/marketplace/reason-action-form";
import { PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BOOKING_STATUS, formatDateTime, PAYMENT_STATUS } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { requireRole } from "@/server/auth/dal";
import { listPayments } from "@/server/payments";

export const metadata: Metadata = { title: "Payments" };

const REFUNDABLE_BOOKING_STATUSES = ["cancelled", "rejected", "expired"];

export default async function AdminPaymentsPage() {
  await requireRole("admin");
  const rows = await listPayments();
  const needsRefund = rows.filter((row) => row.payment.status === "successful" && REFUNDABLE_BOOKING_STATUSES.includes(row.bookingStatus));

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every payment attempt with its commission split. Payments on cancelled bookings must be refunded."
      />
      {needsRefund.length > 0 && (
        <section aria-labelledby="refunds" className="mb-8 grid gap-3">
          <h2 id="refunds" className="text-[19px] font-semibold text-navy">
            Refunds due ({needsRefund.length})
          </h2>
          {needsRefund.map(({ payment, bookingReference, bookingStatus }) => (
            <div key={payment.id} className="grid gap-4 rounded-lg border border-orange-ink/40 bg-white p-5 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <p className="font-semibold text-navy">
                  {formatNaira(payment.amountKobo)} for <Link href={`/admin/bookings/${payment.bookingId}`} className="underline decoration-orange decoration-2 underline-offset-4">{bookingReference}</Link>
                </p>
                <p className="mt-1 text-[14px] text-navy/70">
                  {payment.provider === "paystack" ? "Paystack" : "Offline transfer"}, reference {payment.reference}. Booking is <StatusBadge status={bookingStatus} map={BOOKING_STATUS} />
                </p>
              </div>
              <ReasonActionForm
                action={refundPaymentAction.bind(null, payment.id)}
                trigger="Refund"
                confirmLabel={payment.provider === "paystack" ? "Refund through Paystack" : "Record manual refund"}
                reasonLabel="Reason for the refund"
              />
            </div>
          ))}
        </section>
      )}
      <DataTable caption="Payments" headers={["Booking", "Amount", "Commission", "Vendor share", "Method", "Paid", "Status"]}>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-4 py-10 text-center text-navy/70">
              No payments yet.
            </td>
          </tr>
        ) : (
          rows.map(({ payment, bookingReference }) => (
            <tr key={payment.id} className="hover:bg-navy/[0.02]">
              <td className="px-4 py-3">
                <Link href={`/admin/bookings/${payment.bookingId}`} className="font-semibold text-navy underline-offset-4 hover:underline">
                  {bookingReference}
                </Link>
                <span className="block font-mono text-[12px] text-navy/70">{payment.reference}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap font-semibold text-navy">{formatNaira(payment.amountKobo)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-navy/80">{payment.platformFeeKobo === null ? "None" : formatNaira(payment.platformFeeKobo)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-navy/80">{payment.vendorPayableKobo === null ? "None" : formatNaira(payment.vendorPayableKobo)}</td>
              <td className="px-4 py-3 text-navy/80">{payment.provider === "paystack" ? `Paystack${payment.channel ? `, ${payment.channel}` : ""}` : "Bank transfer"}</td>
              <td className="px-4 py-3 whitespace-nowrap text-navy/80">{payment.paidAt ? formatDateTime(payment.paidAt) : "Not paid"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={payment.status} map={PAYMENT_STATUS} />
                {payment.failureReason && <span className="mt-1 block max-w-[240px] text-[12px] text-navy/70">{payment.failureReason}</span>}
              </td>
            </tr>
          ))
        )}
      </DataTable>
    </>
  );
}
