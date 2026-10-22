import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDisputeReplyAction, assignDisputeAction, updateDisputeStatusAction } from "@/app/admin/disputes/actions";
import { DeliveryTimeline } from "@/components/delivery/delivery-timeline";
import { DisputeReplyForm } from "@/components/disputes/dispute-forms";
import { DisputeSummary, DisputeThread } from "@/components/disputes/dispute-panel";
import { ActionButton } from "@/components/ui/action-button";
import { Card, CardHeader, DescriptionList } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BOOKING_STATUS, PAYMENT_STATUS, PAYOUT_STATUS } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { requireRole } from "@/server/auth/dal";
import { listDeliveryEvents } from "@/server/delivery";
import { ACTIVE_DISPUTE_STATUSES, disputeThread, getDispute } from "@/server/disputes";
import { listPayouts, paymentsForBooking } from "@/server/payments";
import { DisputeStatusForm } from "./status-form";

export const metadata: Metadata = { title: "Dispute" };

export default async function AdminDisputePage({ params }: PageProps<"/admin/disputes/[disputeId]">) {
  const admin = await requireRole("admin");
  const { disputeId } = await params;
  const row = /^[0-9a-f-]{36}$/i.test(disputeId) ? await getDispute(disputeId) : null;
  if (!row) {
    notFound();
  }
  const { dispute, booking } = row;
  const [thread, deliveryRows, payments, payouts] = await Promise.all([
    disputeThread(dispute.id),
    listDeliveryEvents(booking.id),
    paymentsForBooking(booking.id),
    listPayouts({ bookingId: booking.id }),
  ]);
  const active = ACTIVE_DISPUTE_STATUSES.includes(dispute.status);

  return (
    <>
      <Link href="/admin/disputes" className="text-[14px] font-semibold text-navy/70 hover:text-navy">
        Back to disputes
      </Link>
      <header className="mb-8 mt-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-orange-ink">Dispute</p>
        <h1 className="mt-2 font-display text-[clamp(34px,4vw,56px)] uppercase leading-[0.95] text-navy">{booking.reference}</h1>
        <p className="mt-2 text-[15px] text-navy/70">
          {row.vendorName}.{" "}
          <Link href={`/admin/bookings/${booking.id}`} className="font-semibold underline decoration-orange decoration-2 underline-offset-4">
            Open booking
          </Link>
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="grid content-start gap-6">
          <DisputeSummary dispute={dispute} openedByName={row.openedByName} />
          {active && (
            <Card tone="attention">
              <CardHeader
                title="Handle this dispute"
                description={dispute.assignedTo === admin.id ? "Assigned to you." : dispute.assignedTo ? "Assigned to another administrator." : "Not assigned yet."}
              />
              <div className="grid gap-5">
                {dispute.assignedTo !== admin.id && <ActionButton action={assignDisputeAction.bind(null, dispute.id)} label="Assign to me" pendingLabel="Assigning" variant="secondary" />}
                <DisputeStatusForm action={updateDisputeStatusAction.bind(null, dispute.id)} current={dispute.status} />
              </div>
            </Card>
          )}
          <Card>
            <CardHeader title="Money" description="Refunds are issued from Payments. Payouts are released when the dispute closes on a completed booking." />
            <DescriptionList
              items={[
                { label: "Booking", value: <StatusBadge status={booking.status} map={BOOKING_STATUS} /> },
                { label: "Total", value: formatNaira(booking.totalKobo) },
                ...payments.map((payment) => ({
                  label: `Payment ${payment.reference}`,
                  value: (
                    <span className="inline-flex items-center gap-2">
                      {formatNaira(payment.amountKobo)} <StatusBadge status={payment.status} map={PAYMENT_STATUS} />
                    </span>
                  ),
                })),
                ...payouts.map(({ payout }) => ({
                  label: "Vendor payout",
                  value: (
                    <span className="inline-flex items-center gap-2">
                      {formatNaira(payout.amountKobo)} <StatusBadge status={payout.status} map={PAYOUT_STATUS} />
                    </span>
                  ),
                })),
              ]}
            />
          </Card>
          <DeliveryTimeline rows={deliveryRows} />
        </div>
        <DisputeThread thread={thread} reply={active ? <DisputeReplyForm action={adminDisputeReplyAction.bind(null, dispute.id)} /> : undefined} />
      </div>
    </>
  );
}
