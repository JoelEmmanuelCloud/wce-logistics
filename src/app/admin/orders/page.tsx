import type { Metadata } from "next";
import { FilterTabs } from "@/components/admin/list-controls";
import { OrderList } from "@/components/shop/order-parts";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { requireRole } from "@/server/auth/dal";
import type { OrderStatus } from "@/server/db/schema";
import { listOrders } from "@/server/orders";

export const metadata: Metadata = { title: "Orders" };

const FILTERS = {
  new: { label: "Awaiting seller", statuses: ["awaiting_seller"] },
  accepted: { label: "Accepted", statuses: ["accepted"] },
  closed: { label: "Closed", statuses: ["declined", "cancelled", "expired"] },
  all: { label: "All", statuses: [] },
} as const satisfies Record<string, { label: string; statuses: readonly OrderStatus[] }>;

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireRole("admin");
  const params = await searchParams;
  const filter = (typeof params.status === "string" && params.status in FILTERS ? params.status : "all") as keyof typeof FILTERS;
  const rows = await listOrders({ statuses: [...FILTERS[filter].statuses] });

  return (
    <>
      <PageHeader title="Orders" description="Every shop order. Payment, delivery and disputes for accepted orders are handled on the matching booking." />
      <div className="mb-5">
        <FilterTabs base="/admin/orders" filters={FILTERS} active={filter} query="" />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Nothing here" description="No orders match this view." />
      ) : (
        <OrderList rows={rows} hrefFor={(orderId) => `/admin/orders/${orderId}`} counterparty="both" />
      )}
    </>
  );
}
