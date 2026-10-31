import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelOrderAction } from "@/app/account/orders/actions";
import { ChevronLeftIcon } from "@/components/line-icons";
import { ReasonActionForm } from "@/components/marketplace/reason-action-form";
import { OrderItems, OrderStatusBadge } from "@/components/shop/order-parts";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, CardHeader, DescriptionList, PageHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { requireRole } from "@/server/auth/dal";
import { getOrderDetail } from "@/server/orders";

export const metadata: Metadata = { title: "Order" };

export default async function CustomerOrderPage({ params }: PageProps<"/account/orders/[orderId]">) {
  const { orderId } = await params;
  const user = await requireRole("customer");
  const detail = /^[0-9a-f-]{36}$/i.test(orderId) ? await getOrderDetail(orderId) : null;
  if (!detail || detail.order.customerId !== user.id) {
    notFound();
  }
  const { order, items, bookingStatus } = detail;

  return (
    <>
      <Link href="/account/orders" className="group inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to orders
      </Link>
      <PageHeader title={order.reference} description={`Ordered ${formatDateTime(order.createdAt)} from ${detail.sellerName}`} action={<OrderStatusBadge status={order.status} bookingStatus={bookingStatus} />} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="grid content-start gap-6">
          <OrderItems items={items} goodsKobo={order.goodsKobo} deliveryKobo={order.deliveryKobo} totalKobo={order.totalKobo} weightKg={order.weightKg} />
          <Card>
            <CardHeader title="Delivery" />
            <DescriptionList
              items={[
                { label: "From", value: `${detail.sellerCity}, ${detail.sellerState}` },
                { label: "To", value: `${order.destinationAddress}, ${order.destinationCity}, ${order.destinationState}` },
                { label: "Notes", value: order.deliveryNotes },
              ]}
            />
          </Card>
        </div>
        <div className="order-first grid content-start gap-6 xl:order-none">
          {order.status === "awaiting_seller" && (
            <>
              <Alert tone="info" title="Waiting for the seller">
                {detail.sellerName} has until {formatDateTime(order.responseDueAt)} to confirm stock and schedule a truck. Your goods are held for you, and you pay nothing until they accept.
              </Alert>
              <ReasonActionForm action={cancelOrderAction.bind(null, order.id)} trigger="Cancel order" confirmLabel="Cancel order" reasonLabel="Why are you cancelling?" />
            </>
          )}
          {order.status === "accepted" && bookingStatus === "awaiting_payment" && (
            <>
              <Alert tone="success" title="Accepted. Pay to confirm.">
                Delivery is scheduled. Pay {formatNaira(order.totalKobo)} by {formatDateTime(detail.bookingDueAt)} to keep your order.
              </Alert>
              <Link href={`/account/bookings/${order.bookingId}`} className={buttonClasses("primary", "lg")}>
                Pay now
              </Link>
            </>
          )}
          {order.status === "accepted" && bookingStatus !== "awaiting_payment" && (
            <Link href={`/account/bookings/${order.bookingId}`} className={buttonClasses("primary", "lg")}>
              Track delivery
            </Link>
          )}
          {order.status === "declined" && (
            <Alert tone="error" title="The seller declined this order">
              {order.statusNote ?? "They could not take this order."} You have not been charged.
            </Alert>
          )}
          {(order.status === "cancelled" || order.status === "expired") && (
            <Alert tone="info" title={order.status === "cancelled" ? "Order cancelled" : "Order expired"}>
              {order.statusNote}
            </Alert>
          )}
        </div>
      </div>
    </>
  );
}
