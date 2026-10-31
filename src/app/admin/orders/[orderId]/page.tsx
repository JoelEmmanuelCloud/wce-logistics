import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "@/components/line-icons";
import { OrderItems, OrderStatusBadge } from "@/components/shop/order-parts";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, CardHeader, DescriptionList, PageHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { requireRole } from "@/server/auth/dal";
import { getOrderDetail } from "@/server/orders";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[orderId]">) {
  const { orderId } = await params;
  await requireRole("admin");
  const detail = /^[0-9a-f-]{36}$/i.test(orderId) ? await getOrderDetail(orderId) : null;
  if (!detail) {
    notFound();
  }
  const { order, items } = detail;

  return (
    <>
      <Link href="/admin/orders" className="group inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to orders
      </Link>
      <PageHeader title={order.reference} description={`Ordered ${formatDateTime(order.createdAt)}`} action={<OrderStatusBadge status={order.status} bookingStatus={detail.bookingStatus} />} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <OrderItems items={items} goodsKobo={order.goodsKobo} deliveryKobo={order.deliveryKobo} totalKobo={order.totalKobo} weightKg={order.weightKg} />
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Parties" />
            <DescriptionList
              items={[
                { label: "Seller", value: detail.sellerName },
                { label: "Buyer", value: detail.customerName },
                { label: "Buyer phone", value: formatPhone(detail.customerPhone) },
                { label: "Deliver to", value: `${order.destinationAddress}, ${order.destinationCity}, ${order.destinationState}` },
                { label: "Note", value: order.statusNote },
              ]}
            />
          </Card>
          {order.bookingId && (
            <Link href={`/admin/bookings/${order.bookingId}`} className={buttonClasses("primary", "lg")}>
              Open booking
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
