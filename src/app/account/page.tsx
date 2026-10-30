import type { Metadata } from "next";
import Link from "next/link";
import { AccountForm } from "@/components/app/account-form";
import { ArrowUpRightIcon } from "@/components/line-icons";
import { BookingList } from "@/components/marketplace/booking-list";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { SHIPPER_STEPS } from "@/data/landing";
import { formatPhone } from "@/lib/phone";
import { requireRole } from "@/server/auth/dal";
import type { BookingStatus } from "@/server/db/schema";
import { listBookings } from "@/server/marketplace";

export const metadata: Metadata = { title: "Account" };

const MOVING: BookingStatus[] = ["pending_vendor_acceptance", "confirmed", "pickup_scheduled", "goods_collected", "in_transit", "delivery_attempted"];
const DONE: BookingStatus[] = ["delivered", "completed"];

function Stat({ label, value, href, highlight = false }: { label: string; value: number; href: string; highlight?: boolean }) {
  const active = highlight && value > 0;
  return (
    <Link
      href={href}
      className={`group flex flex-col justify-between gap-4 rounded-2xl border p-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange ${
        active ? "border-orange/60 bg-orange/[0.06] hover:border-orange" : "border-navy/10 bg-white hover:border-navy/30"
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-semibold text-navy/70">{label}</span>
        <ArrowUpRightIcon className="size-4 shrink-0 text-navy/35 transition-[color,translate] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-navy" />
      </span>
      <span className={`font-display text-[44px] leading-none ${active ? "text-orange-ink" : "text-navy"}`}>{value}</span>
    </Link>
  );
}

function GettingStarted() {
  return (
    <section aria-labelledby="getting-started" className="rounded-2xl bg-navy p-[clamp(20px,2.4vw,32px)] text-white">
      <h2 id="getting-started" className="font-display text-[clamp(28px,2.6vw,40px)] uppercase leading-none">
        Your first shipment <span className="text-orange">in four steps</span>
      </h2>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SHIPPER_STEPS.map((step, index) => (
          <li key={step.title} className="rounded-xl border border-white/12 bg-white/[0.04] p-5">
            <span className="grid size-9 place-items-center rounded-full bg-orange font-display text-[17px] text-navy">{index + 1}</span>
            <h3 className="mt-4 text-[16px] font-semibold">{step.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-white/70">{step.detail}</p>
          </li>
        ))}
      </ol>
      <Link href="/account/shipments/new" className={buttonClasses("primary", "lg", "mt-6")}>
        Describe your load
      </Link>
    </section>
  );
}

export default async function AccountPage() {
  const user = await requireRole("customer");
  const firstName = user.fullName?.split(" ")[0];
  const bookings = await listBookings({ customerId: user.id });
  const count = (statuses: BookingStatus[]) => bookings.filter(({ booking }) => statuses.includes(booking.status)).length;

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description="Book space on verified trucks between Nigerian states, and follow every booking from request to delivery."
        action={
          <Link href="/account/shipments/new" className={buttonClasses("primary", "lg")}>
            Send a shipment
          </Link>
        }
      />
      <div className="grid gap-6">
        {bookings.length === 0 ? (
          <GettingStarted />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Waiting for your payment" value={count(["awaiting_payment"])} href="/account/bookings" highlight />
              <Stat label="Booked and on the way" value={count(MOVING)} href="/account/bookings" />
              <Stat label="Delivered" value={count(DONE)} href="/account/bookings" />
            </div>
            <section aria-labelledby="recent-bookings" className="grid gap-3">
              <div className="flex items-center justify-between">
                <h2 id="recent-bookings" className="text-[19px] font-semibold text-navy">
                  Recent bookings
                </h2>
                <Link href="/account/bookings" className="text-[14px] font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
                  View all
                </Link>
              </div>
              <BookingList rows={bookings.slice(0, 3)} hrefFor={(bookingId) => `/account/bookings/${bookingId}`} counterparty="vendor" />
            </section>
          </>
        )}
        <Card>
          <CardHeader title="Account details" description="Used on your bookings and receipts." />
          <AccountForm fullName={user.fullName ?? ""} email={user.email} phone={user.phone ? formatPhone(user.phone) : ""} />
        </Card>
      </div>
    </>
  );
}
