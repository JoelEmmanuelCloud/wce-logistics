import type { Metadata } from "next";
import { FilterTabs } from "@/components/admin/list-controls";
import { BookingList } from "@/components/marketplace/booking-list";
import { EmptyState, PageHeader } from "@/components/ui/card";
import type { BookingStatus } from "@/server/db/schema";
import { requireRole } from "@/server/auth/dal";
import { listBookings } from "@/server/marketplace";
import { getPlatformSettings } from "@/server/settings";
import { findVendorProfileByUser } from "@/server/vendors";

export const metadata: Metadata = { title: "Bookings" };

const FILTERS = {
  requests: { label: "New requests", statuses: ["pending_vendor_acceptance"] },
  upcoming: { label: "Upcoming", statuses: ["awaiting_payment", "confirmed", "pickup_scheduled", "goods_collected", "in_transit", "delivery_attempted"] },
  past: { label: "Past", statuses: ["delivered", "completed", "rejected", "cancelled", "expired", "disputed"] },
} as const satisfies Record<string, { label: string; statuses: readonly BookingStatus[] }>;

export default async function VendorBookingsPage({ searchParams }: PageProps<"/vendor/bookings">) {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  const params = await searchParams;
  const filter = (typeof params.status === "string" && params.status in FILTERS ? params.status : "requests") as keyof typeof FILTERS;
  const rows = profile ? await listBookings({ vendorId: profile.id, statuses: [...FILTERS[filter].statuses] }) : [];
  const { responseWindowHours } = await getPlatformSettings();

  return (
    <>
      <PageHeader
        title="Bookings"
        description={`Answer new requests within ${responseWindowHours} hours. Requests you do not answer expire and the space is released.`}
      />
      <div className="mb-5">
        <FilterTabs base="/vendor/bookings" filters={FILTERS} active={filter} query="" />
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title={filter === "requests" ? "No new requests" : "Nothing here yet"}
          description="When shippers book space on your trips, their requests appear here."
        />
      ) : (
        <BookingList rows={rows} hrefFor={(bookingId) => `/vendor/bookings/${bookingId}`} counterparty="customer" />
      )}
    </>
  );
}
