import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/admin/list-controls";
import { OrderList } from "@/components/shop/order-parts";
import { buttonClasses } from "@/components/ui/button-classes";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { parsePage } from "@/server/admin";
import { requireRole } from "@/server/auth/dal";
import { listOrders } from "@/server/orders";

export const metadata: Metadata = { title: "Orders" };

export default async function CustomerOrdersPage({ searchParams }: PageProps<"/account/orders">) {
  const user = await requireRole("customer");
  const params = await searchParams;
  const result = await listOrders({ customerId: user.id, page: parsePage(params.page) });
  const shop = (
    <Link href="/shop" className={buttonClasses("primary")}>
      Browse the shop
    </Link>
  );

  return (
    <>
      <PageHeader title="Orders" description="Goods you bought from the shop, from order to delivery." action={result.total > 0 ? shop : undefined} />
      {result.total === 0 ? (
        <EmptyState title="No orders yet" description="Buy bulk goods from verified sellers and have them delivered on their own trucks." action={shop} />
      ) : (
        <>
          <OrderList rows={result.rows} hrefFor={(orderId) => `/account/orders/${orderId}`} counterparty="seller" />
          <Pagination base="/account/orders" page={result.page} pageCount={result.pageCount} total={result.total} params={{}} />
        </>
      )}
    </>
  );
}
