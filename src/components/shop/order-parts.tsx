import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BOOKING_STATUS, formatDateTime, formatKg, ORDER_STATUS } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import type { OrderItem } from "@/server/db/schema";
import type { OrderRow } from "@/server/orders";

export function OrderStatusBadge({ status, bookingStatus }: { status: string; bookingStatus: string | null }) {
  return status === "accepted" && bookingStatus ? <StatusBadge status={bookingStatus} map={BOOKING_STATUS} /> : <StatusBadge status={status} map={ORDER_STATUS} />;
}

export function OrderList({ rows, hrefFor, counterparty }: { rows: OrderRow[]; hrefFor: (id: string) => string; counterparty: "seller" | "customer" | "both" }) {
  return (
    <ul className="grid gap-3">
      {rows.map(({ order, items, sellerName, customerName, bookingStatus }) => (
        <li key={order.id}>
          <Link
            href={hrefFor(order.id)}
            className="grid gap-3 rounded-2xl border border-navy/10 bg-white p-5 transition-colors hover:border-navy/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange md:grid-cols-[1.3fr_1fr_auto] md:items-center"
          >
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-navy/70">{order.reference}</p>
              <p className="mt-1 text-[17px] font-semibold text-navy">
                {items[0]?.title}
                {items.length > 1 && ` and ${items.length - 1} more`}
              </p>
              <p className="mt-1 text-[14px] text-navy/70">
                To {order.destinationCity}, {order.destinationState}, {formatKg(order.weightKg)}. Ordered {formatDateTime(order.createdAt)}
              </p>
            </div>
            <div className="text-[14px] text-navy/70">
              {(counterparty === "seller" || counterparty === "both") && <p>Seller: {sellerName}</p>}
              {(counterparty === "customer" || counterparty === "both") && <p>Buyer: {customerName ?? "Not set"}</p>}
              <p className="mt-1 text-[16px] font-semibold text-navy">{formatNaira(order.totalKobo)}</p>
            </div>
            <OrderStatusBadge status={order.status} bookingStatus={bookingStatus} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function OrderItems({ items, goodsKobo, deliveryKobo, totalKobo, weightKg }: { items: OrderItem[]; goodsKobo: number; deliveryKobo: number; totalKobo: number; weightKg: number }) {
  return (
    <Card>
      <CardHeader title="Items" />
      <ul className="divide-y divide-navy/10">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-4 py-3">
            <span>
              <Link href={`/shop/${item.productId}`} className="block font-semibold text-navy hover:text-orange-ink">
                {item.title}
              </Link>
              <span className="text-[14px] text-navy/70">
                {item.quantity.toLocaleString("en-NG")} x {formatNaira(item.unitPriceKobo)} per {item.unitLabel}
              </span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-navy">{formatNaira(item.lineTotalKobo)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 grid gap-2 border-t border-navy/10 pt-4 text-[15px]">
        <div className="flex justify-between gap-4">
          <dt className="text-navy/70">Goods</dt>
          <dd className="tabular-nums text-navy">{formatNaira(goodsKobo)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-navy/70">Delivery, {formatKg(weightKg)}</dt>
          <dd className="tabular-nums text-navy">{formatNaira(deliveryKobo)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-[17px] font-semibold">
          <dt className="text-navy">Total</dt>
          <dd className="tabular-nums text-navy">{formatNaira(totalKobo)}</dd>
        </div>
      </dl>
    </Card>
  );
}
