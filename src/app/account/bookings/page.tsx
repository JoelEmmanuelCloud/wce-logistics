import type { Metadata } from "next";
import Link from "next/link";
import { BookingList } from "@/components/marketplace/booking-list";
import { buttonClasses } from "@/components/ui/button-classes";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { requireRole } from "@/server/auth/dal";
import { listBookings } from "@/server/marketplace";

export const metadata: Metadata = { title: "Bookings" };

export default async function CustomerBookingsPage() {
  const user = await requireRole("customer");
  const rows = await listBookings({ customerId: user.id });

  return (
    <>
      <PageHeader eyebrow="Shipping" title="Bookings" description="Every truck you have requested, newest first." />
      {rows.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="Start a shipment, compare verified trucks and request the one that suits you."
          action={
            <Link href="/account/shipments/new" className={buttonClasses("primary")}>
              Send a shipment
            </Link>
          }
        />
      ) : (
        <BookingList rows={rows} hrefFor={(bookingId) => `/account/bookings/${bookingId}`} counterparty="vendor" />
      )}
    </>
  );
}
