import "server-only";
import { eq, sql } from "drizzle-orm";
import { schema, type Database } from "@/server/db";
import type { Booking, Order } from "@/server/db/schema";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function restoreOrderStock(tx: Transaction, orderId: string): Promise<void> {
  const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
  for (const item of items) {
    await tx
      .update(schema.products)
      .set({ stockUnits: sql`${schema.products.stockUnits} + ${item.quantity}` })
      .where(eq(schema.products.id, item.productId));
  }
}

export async function closeOrderForBooking(tx: Transaction, booking: Booking, status: "cancelled" | "expired", note: string | null): Promise<Order | null> {
  const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.bookingId, booking.id)).limit(1).for("update");
  if (!order || order.status !== "accepted") {
    return null;
  }
  const [closed] = await tx.update(schema.orders).set({ status, statusNote: note }).where(eq(schema.orders.id, order.id)).returning();
  await restoreOrderStock(tx, order.id);
  await tx.update(schema.routes).set({ status: "cancelled" }).where(eq(schema.routes.id, booking.routeId));
  return closed;
}
