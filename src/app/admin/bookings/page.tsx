import type { Metadata } from "next";
import { FilterTabs } from "@/components/admin/list-controls";
import { BookingList } from "@/components/marketplace/booking-list";
import { EmptyState, PageHeader } from "@/components/ui/card";
import type { BookingStatus } from "@/server/db/schema";
import { requireRole } from "@/server/auth/dal";
import { listBookings } from "@/server/marketplace";

export const metadata: Metadata = { title: "Bookings" };

const FILTERS = {
  payment: { label: "Awaiting payment", statuses: ["awaiting_payment"] },
  pending: { label: "Awaiting vendor", statuses: ["pending_vendor_acceptance"] },
  active: { label: "Confirmed and moving", statuses: ["confirmed", "pickup_scheduled", "goods_collected", "in_transit", "delivery_attempted", "delivered"] },
  closed: { label: "Closed", statuses: ["completed", "rejected", "cancelled", "expired", "disputed"] },
  all: { label: "All", statuses: [] },
} as const satisfies Record<string, { label: string; statuses: readonly BookingStatus[] }>;

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  await requireRole("admin");
  const params = await searchParams;
  const filter = (typeof params.status === "string" && params.status in FILTERS ? params.status : "payment") as keyof typeof FILTERS;
  const rows = await listBookings({ statuses: [...FILTERS[filter].statuses] });

  return (
    <>
      <PageHeader title="Bookings" description="Record payments, follow trips and step in when a booking needs help." />
      <div className="mb-5">
        <FilterTabs base="/admin/bookings" filters={FILTERS} active={filter} query="" />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Nothing here" description="No bookings match this view." />
      ) : (
        <BookingList rows={rows} hrefFor={(bookingId) => `/admin/bookings/${bookingId}`} counterparty="both" />
      )}
    </>
  );
}
