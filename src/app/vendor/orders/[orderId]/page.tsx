import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { acceptOrderAction, declineOrderAction } from "@/app/vendor/orders/actions";
import { ChevronLeftIcon } from "@/components/line-icons";
import { ReasonActionForm } from "@/components/marketplace/reason-action-form";
import { OrderItems, OrderStatusBadge } from "@/components/shop/order-parts";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, CardHeader, DescriptionList, PageHeader } from "@/components/ui/card";
import { addDays, lagosToday } from "@/lib/dates";
import { formatDateTime, formatKg } from "@/lib/labels";
import { MAX_DELIVERY_HORIZON_DAYS } from "@/lib/validation/shop";
import { requireRole } from "@/server/auth/dal";
import { getOrderDetail, trucksForOrder } from "@/server/orders";
import { findVendorProfileByUser } from "@/server/vendors";
import { AcceptOrderForm } from "./accept-form";

export const metadata: Metadata = { title: "Order" };

export default async function VendorOrderPage({ params }: PageProps<"/vendor/orders/[orderId]">) {
  const { orderId } = await params;
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  const detail = /^[0-9a-f-]{36}$/i.test(orderId) ? await getOrderDetail(orderId) : null;
  if (!detail || detail.order.vendorId !== profile.id) {
    notFound();
  }
  const { order, items } = detail;
  const awaiting = order.status === "awaiting_seller";
  const trucks = awaiting ? await trucksForOrder(profile.id, order.weightKg) : [];
  const today = lagosToday();

  return (
    <>
      <Link href="/vendor/orders" className="group inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to orders
      </Link>
      <PageHeader title={order.reference} description={`Ordered ${formatDateTime(order.createdAt)}`} action={<OrderStatusBadge status={order.status} bookingStatus={detail.bookingStatus} />} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="grid content-start gap-6">
          <OrderItems items={items} goodsKobo={order.goodsKobo} deliveryKobo={order.deliveryKobo} totalKobo={order.totalKobo} weightKg={order.weightKg} />
          <Card>
            <CardHeader title="Delivery" />
            <DescriptionList
              items={[
                { label: "Buyer", value: detail.customerName },
                { label: "Phone", value: awaiting ? "Shown once the order is paid" : order.bookingId ? "See the booking" : null },
                { label: "Deliver to", value: `${order.destinationAddress}, ${order.destinationCity}, ${order.destinationState}` },
                { label: "Total weight", value: formatKg(order.weightKg) },
                { label: "Notes", value: order.deliveryNotes },
              ]}
            />
          </Card>
        </div>
        <div className="order-first grid content-start gap-6 xl:order-none">
          {order.statusNote && !awaiting && (
            <Alert tone="info" title="Note">
              {order.statusNote}
            </Alert>
          )}
          {awaiting && (
            <>
              <Card>
                <CardHeader title="Accept this order" description={`Answer by ${formatDateTime(order.responseDueAt)}. The buyer pays after you accept.`} />
                {trucks.length === 0 ? (
                  <Alert tone="warning" title="No suitable truck">
                    This order weighs {formatKg(order.weightKg)}. You need an approved truck that can carry it before you can accept.
                  </Alert>
                ) : (
                  <AcceptOrderForm
                    action={acceptOrderAction.bind(null, order.id)}
                    trucks={trucks.map((truck) => ({ id: truck.id, label: `${truck.registrationNumber}, ${truck.make} ${truck.model}, ${formatKg(truck.maxPayloadKg)}` }))}
                    minDate={today}
                    maxDate={addDays(today, MAX_DELIVERY_HORIZON_DAYS)}
                  />
                )}
              </Card>
              <ReasonActionForm action={declineOrderAction.bind(null, order.id)} trigger="Decline order" confirmLabel="Decline order" reasonLabel="Why are you declining?" />
            </>
          )}
          {order.bookingId && (
            <Link href={`/vendor/bookings/${order.bookingId}`} className={buttonClasses("primary", "lg")}>
              Open delivery booking
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
