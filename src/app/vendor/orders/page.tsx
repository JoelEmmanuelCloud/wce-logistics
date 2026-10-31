import type { Metadata } from "next";
import { FilterTabs } from "@/components/admin/list-controls";
import { OrderList } from "@/components/shop/order-parts";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { requireRole } from "@/server/auth/dal";
import type { OrderStatus } from "@/server/db/schema";
import { listOrders } from "@/server/orders";
import { findVendorProfileByUser } from "@/server/vendors";

export const metadata: Metadata = { title: "Orders" };

const FILTERS = {
  new: { label: "New", statuses: ["awaiting_seller"] },
  accepted: { label: "Accepted", statuses: ["accepted"] },
  closed: { label: "Closed", statuses: ["declined", "cancelled", "expired"] },
  all: { label: "All", statuses: [] },
} as const satisfies Record<string, { label: string; statuses: readonly OrderStatus[] }>;

export default async function VendorOrdersPage({ searchParams }: PageProps<"/vendor/orders">) {
  const user = await requireRole("vendor");
  const params = await searchParams;
  const filter = (typeof params.status === "string" && params.status in FILTERS ? params.status : "new") as keyof typeof FILTERS;
  const profile = await findVendorProfileByUser(user.id);
  const rows = profile ? await listOrders({ vendorId: profile.id, statuses: [...FILTERS[filter].statuses] }) : [];

  return (
    <>
      <PageHeader title="Orders" description="Accept an order, choose a truck and date, and the buyer pays. Then deliver it like any booking." />
      <div className="mb-5">
        <FilterTabs base="/vendor/orders" filters={FILTERS} active={filter} query="" />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Nothing here" description="No orders match this view." />
      ) : (
        <OrderList rows={rows} hrefFor={(orderId) => `/vendor/orders/${orderId}`} counterparty="customer" />
      )}
    </>
  );
}
