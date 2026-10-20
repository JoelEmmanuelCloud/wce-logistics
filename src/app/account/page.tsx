import type { Metadata } from "next";
import Link from "next/link";
import { AccountForm } from "@/components/app/account-form";
import { BookingList } from "@/components/marketplace/booking-list";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { formatPhone } from "@/lib/phone";
import { requireRole } from "@/server/auth/dal";
import { listBookings } from "@/server/marketplace";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireRole("customer", "driver");
  const firstName = user.fullName?.split(" ")[0];
  const recent = (await listBookings({ customerId: user.id })).slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="Shipper account"
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description="Book space on verified trucks between Nigerian states, and follow every booking from request to delivery."
        action={
          <Link href="/account/shipments/new" className={buttonClasses("primary", "lg")}>
            Send a shipment
          </Link>
        }
      />
      <div className="grid gap-6">
        {recent.length > 0 && (
          <section aria-labelledby="recent-bookings" className="grid gap-3">
            <div className="flex items-center justify-between">
              <h2 id="recent-bookings" className="text-[19px] font-semibold text-navy">
                Recent bookings
              </h2>
              <Link href="/account/bookings" className="text-[14px] font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
                View all
              </Link>
            </div>
            <BookingList rows={recent} hrefFor={(bookingId) => `/account/bookings/${bookingId}`} counterparty="vendor" />
          </section>
        )}
        <Card>
          <CardHeader title="Account details" description="Used on your bookings and receipts." />
          <AccountForm fullName={user.fullName ?? ""} email={user.email} phone={user.phone ? formatPhone(user.phone) : ""} />
        </Card>
      </div>
    </>
  );
}
