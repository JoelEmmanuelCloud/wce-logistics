import type { Metadata } from "next";
import Link from "next/link";
import { OrderList } from "@/components/shop/order-parts";
import { buttonClasses } from "@/components/ui/button-classes";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { requireRole } from "@/server/auth/dal";
import { listOrders } from "@/server/orders";

export const metadata: Metadata = { title: "Orders" };

export default async function CustomerOrdersPage() {
  const user = await requireRole("customer");
  const rows = await listOrders({ customerId: user.id });
  const shop = (
    <Link href="/shop" className={buttonClasses("primary")}>
      Browse the shop
    </Link>
  );

  return (
    <>
      <PageHeader title="Orders" description="Goods you bought from the shop, from order to delivery." action={rows.length > 0 ? shop : undefined} />
      {rows.length === 0 ? (
        <EmptyState title="No orders yet" description="Buy bulk goods from verified sellers and have them delivered on their own trucks." action={shop} />
      ) : (
        <OrderList rows={rows} hrefFor={(orderId) => `/account/orders/${orderId}`} counterparty="seller" />
      )}
    </>
  );
}
