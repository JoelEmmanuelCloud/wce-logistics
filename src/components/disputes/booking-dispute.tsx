import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon } from "@/components/line-icons";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import type { Booking, Dispute } from "@/server/db/schema";
import { ACTIVE_DISPUTE_STATUSES, type disputeThread } from "@/server/disputes";
import { DisputeSummary, DisputeThread } from "./dispute-panel";

export function BookingDispute({
  booking,
  backHref,
  dispute,
  thread,
  canOpen,
  windowDays,
  openForm,
  replyForm,
}: {
  booking: Booking;
  backHref: string;
  dispute: Dispute | null;
  thread: Awaited<ReturnType<typeof disputeThread>>;
  canOpen: boolean;
  windowDays: number;
  openForm: ReactNode;
  replyForm: ReactNode;
}) {
  const active = dispute !== null && ACTIVE_DISPUTE_STATUSES.includes(dispute.status);
  return (
    <>
      <Link href={backHref} className="group inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to booking {booking.reference}
      </Link>
      <header className="mb-8 mt-4">
        <p className="text-[14px] font-medium text-navy/70">Dispute</p>
        <h1 className="mt-1 font-display text-[clamp(34px,4vw,56px)] uppercase leading-[0.95] text-navy">{booking.reference}</h1>
      </header>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="grid content-start gap-6">
          {!active && canOpen && (
            <Card tone="attention">
              <CardHeader title="Report a problem" description="Tell us what went wrong. Our team reviews every dispute and may ask both sides for more information. Vendor payouts stay on hold until it is resolved." />
              {openForm}
            </Card>
          )}
          {!active && !canOpen && !dispute && (
            <Alert tone="info" title="Disputes are not available for this booking">
              A problem can be reported on a paid booking, up to {windowDays} days after it is completed or cancelled.
            </Alert>
          )}
          {dispute && <DisputeSummary dispute={dispute} />}
        </div>
        {dispute && <DisputeThread thread={thread} reply={active ? replyForm : undefined} />}
      </div>
    </>
  );
}
