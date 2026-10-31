import "server-only";
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import type { NigerianState } from "@/data/nigeria-states";
import { formatKg } from "@/lib/labels";
import { MAX_ORDER_KOBO, orderTotals, type CartLine } from "@/lib/shop";
import type { AcceptOrderInput, CheckoutInput } from "@/lib/validation/shop";
import { recordAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import type { Booking, Order, OrderItem, OrderStatus } from "@/server/db/schema";
import { addEvent, bookingReference, createRouteIn, MarketplaceError, type Transaction } from "@/server/marketplace";
import { closeOrderForBooking, restoreOrderStock } from "@/server/order-stock";
import { getPlatformSettings } from "@/server/settings";

export class OrderError extends Error {}

const sellerName = sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`;

export async function placeOrder(customerId: string, lines: readonly CartLine[], input: CheckoutInput): Promise<Order> {
  if (lines.length === 0) {
    throw new OrderError("Your cart is empty.");
  }
  const settings = await getPlatformSettings();
  return db().transaction(async (tx) => {
    const ids = [...new Set(lines.map((line) => line.productId))].sort();
    const products = await tx
      .select({ product: schema.products, verification: schema.vendorProfiles.verificationStatus })
      .from(schema.products)
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.products.vendorId))
      .where(inArray(schema.products.id, ids))
      .orderBy(schema.products.id)
      .for("update", { of: schema.products });
    if (products.length !== ids.length) {
      throw new OrderError("Something in your cart is no longer on sale. Review your cart and try again.");
    }

    const vendorId = products[0].product.vendorId;
    const quantities = new Map(lines.map((line) => [line.productId, line.quantity]));
    const priced = products.map(({ product, verification }) => {
      const quantity = quantities.get(product.id) ?? 0;
      if (product.vendorId !== vendorId) {
        throw new OrderError("Each order can only contain goods from one seller.");
      }
      if (product.status !== "active" || verification !== "verified") {
        throw new OrderError(`${product.title} is no longer on sale.`);
      }
      if (quantity < product.minOrderUnits) {
        throw new OrderError(`The minimum order for ${product.title} is ${product.minOrderUnits.toLocaleString("en-NG")}.`);
      }
      if (quantity > product.stockUnits) {
        throw new OrderError(`Only ${product.stockUnits.toLocaleString("en-NG")} of ${product.title} left in stock.`);
      }
      return { product, quantity };
    });

    const [rate] = await tx
      .select()
      .from(schema.deliveryRates)
      .where(and(eq(schema.deliveryRates.vendorId, vendorId), eq(schema.deliveryRates.destinationState, input.destinationState)))
      .limit(1);
    if (!rate) {
      throw new OrderError(`This seller does not deliver to ${input.destinationState}.`);
    }

    const totals = orderTotals(
      priced.map(({ product, quantity }) => ({ unitPriceKobo: product.priceKobo, unitWeightKg: product.unitWeightKg, quantity })),
      rate,
    );
    if (totals.weightKg < settings.minShipmentKg) {
      throw new OrderError(`Orders must weigh at least ${formatKg(settings.minShipmentKg)}. Yours is ${formatKg(totals.weightKg)}.`);
    }
    if (totals.totalKobo > MAX_ORDER_KOBO) {
      throw new OrderError("This order is too large to place online. Contact us and we will arrange it with you.");
    }

    const [order] = await tx
      .insert(schema.orders)
      .values({
        reference: bookingReference(),
        customerId,
        vendorId,
        destinationState: input.destinationState,
        destinationCity: input.destinationCity,
        destinationAddress: input.destinationAddress,
        deliveryNotes: input.deliveryNotes,
        weightKg: totals.weightKg,
        ratePerTonneKobo: rate.ratePerTonneKobo,
        goodsKobo: totals.goodsKobo,
        deliveryKobo: totals.deliveryKobo,
        totalKobo: totals.totalKobo,
        responseDueAt: sql`now() + make_interval(hours => ${settings.responseWindowHours})`,
      })
      .returning();

    for (const { product, quantity } of priced) {
      await tx.insert(schema.orderItems).values({
        orderId: order.id,
        productId: product.id,
        title: product.title,
        unitLabel: product.unitLabel,
        unitWeightKg: product.unitWeightKg,
        unitPriceKobo: product.priceKobo,
        quantity,
        lineTotalKobo: product.priceKobo * quantity,
      });
      await tx
        .update(schema.products)
        .set({ stockUnits: sql`${schema.products.stockUnits} - ${quantity}` })
        .where(eq(schema.products.id, product.id));
    }
    await recordAudit({ actorId: customerId, action: "order.placed", entityType: "order", entityId: order.id, metadata: { reference: order.reference, totalKobo: order.totalKobo } }, tx);
    return order;
  });
}

async function lockOrder(tx: Transaction, orderId: string): Promise<Order | null> {
  const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1).for("update");
  return order ?? null;
}

async function createDeliveryBooking(tx: Transaction, order: Order, actorId: string, input: AcceptOrderInput, responseWindowHours: number): Promise<Booking> {
  const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  const [seller] = await tx.select().from(schema.vendorProfiles).where(eq(schema.vendorProfiles.id, order.vendorId)).limit(1);
  const [firstProduct] = await tx.select({ category: schema.products.category }).from(schema.products).where(eq(schema.products.id, items[0].productId)).limit(1);

  const route = await createRouteIn(tx, order.vendorId, actorId, {
    truckId: input.truckId,
    originState: seller.state as NigerianState,
    originCity: seller.city,
    destinationState: order.destinationState as NigerianState,
    destinationCity: order.destinationCity,
    departureDate: input.departureDate,
    transitHours: input.transitHours,
    capacityKg: order.weightKg,
    allowsShared: false,
    ratePerTonneKobo: order.ratePerTonneKobo,
    minimumChargeKobo: 0,
    dedicatedPriceKobo: null,
    loadingChargeKobo: 0,
    offloadingChargeKobo: 0,
    tollChargeKobo: 0,
  });
  await tx.update(schema.routes).set({ reservedKg: order.weightKg }).where(eq(schema.routes.id, route.id));

  const [shipment] = await tx
    .insert(schema.shipments)
    .values({
      customerId: order.customerId,
      originState: seller.state,
      originCity: seller.city,
      originAddress: seller.addressLine,
      destinationState: order.destinationState,
      destinationCity: order.destinationCity,
      destinationAddress: order.destinationAddress,
      cargoType: firstProduct.category,
      description: items.map((item) => `${item.quantity.toLocaleString("en-NG")} x ${item.title}`).join(", ").slice(0, 500),
      weightKg: order.weightKg,
      packageCount: items.reduce((sum, item) => sum + item.quantity, 0),
      declaredValueKobo: order.goodsKobo,
      pickupDate: input.departureDate,
      handlingNotes: order.deliveryNotes,
      bookingType: "dedicated",
      status: "booked",
    })
    .returning();

  const [booking] = await tx
    .insert(schema.bookings)
    .values({
      reference: order.reference,
      shipmentId: shipment.id,
      routeId: route.id,
      truckId: input.truckId,
      vendorId: order.vendorId,
      customerId: order.customerId,
      type: "dedicated",
      status: "awaiting_payment",
      reservedKg: order.weightKg,
      chargeableWeightKg: order.weightKg,
      ratePerTonneKobo: order.ratePerTonneKobo,
      lineItems: [
        ...items.map((item) => ({ label: `${item.quantity.toLocaleString("en-NG")} x ${item.title} (${item.unitLabel})`, amountKobo: item.lineTotalKobo })),
        { label: `Delivery to ${order.destinationCity}, ${order.destinationState}`, amountKobo: order.deliveryKobo },
      ],
      totalKobo: order.totalKobo,
      responseDueAt: sql`now() + make_interval(hours => ${responseWindowHours})`,
      respondedAt: sql`now()`,
    })
    .returning();
  await addEvent(tx, booking.id, "awaiting_payment", actorId, "Seller accepted the order and scheduled delivery.");
  return booking;
}

export async function acceptOrder(vendorId: string, actorId: string, orderId: string, input: AcceptOrderInput): Promise<Order> {
  const { responseWindowHours } = await getPlatformSettings();
  try {
    return await db().transaction(async (tx) => {
      const order = await lockOrder(tx, orderId);
      if (!order || order.vendorId !== vendorId) {
        throw new OrderError("Order not found.");
      }
      if (order.status !== "awaiting_seller") {
        throw new OrderError("This order has already been answered.");
      }
      if (order.responseDueAt.getTime() <= Date.now()) {
        throw new OrderError("The time to respond to this order has passed.");
      }
      const booking = await createDeliveryBooking(tx, order, actorId, input, responseWindowHours);
      const [accepted] = await tx.update(schema.orders).set({ status: "accepted", bookingId: booking.id }).where(eq(schema.orders.id, order.id)).returning();
      await recordAudit({ actorId, action: "order.accepted", entityType: "order", entityId: order.id, metadata: { bookingId: booking.id, truckId: input.truckId, departureDate: input.departureDate } }, tx);
      return accepted;
    });
  } catch (error) {
    if (error instanceof MarketplaceError) {
      throw new OrderError(error.message);
    }
    throw error;
  }
}

async function closeUnanswered(tx: Transaction, order: Order, status: "declined" | "cancelled" | "expired", actorId: string | null, note: string | null): Promise<Order> {
  const [closed] = await tx.update(schema.orders).set({ status, statusNote: note }).where(eq(schema.orders.id, order.id)).returning();
  await restoreOrderStock(tx, order.id);
  await recordAudit({ actorId, action: `order.${status}`, entityType: "order", entityId: order.id, metadata: { note } }, tx);
  return closed;
}

export async function declineOrder(vendorId: string, actorId: string, orderId: string, reason: string): Promise<Order> {
  return db().transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!order || order.vendorId !== vendorId) {
      throw new OrderError("Order not found.");
    }
    if (order.status !== "awaiting_seller") {
      throw new OrderError("This order has already been answered.");
    }
    return closeUnanswered(tx, order, "declined", actorId, reason);
  });
}

export async function cancelOrder(customerId: string, orderId: string, reason: string): Promise<Order> {
  return db().transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!order || order.customerId !== customerId) {
      throw new OrderError("Order not found.");
    }
    if (order.status !== "awaiting_seller") {
      throw new OrderError("This order can no longer be cancelled here.");
    }
    return closeUnanswered(tx, order, "cancelled", customerId, reason);
  });
}

export async function expireOverdueOrders(): Promise<Order[]> {
  return db().transaction(async (tx) => {
    const closed: Order[] = [];
    const unanswered = await tx
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.status, "awaiting_seller"), lte(schema.orders.responseDueAt, sql`now()`)))
      .limit(500)
      .for("update", { skipLocked: true });
    for (const order of unanswered) {
      closed.push(await closeUnanswered(tx, order, "expired", null, "The seller did not respond in time."));
    }

    const unpaid = await tx
      .select({ booking: schema.bookings })
      .from(schema.bookings)
      .innerJoin(schema.orders, eq(schema.orders.bookingId, schema.bookings.id))
      .where(and(eq(schema.bookings.status, "awaiting_payment"), lte(schema.bookings.responseDueAt, sql`now()`)))
      .limit(500)
      .for("update", { of: schema.bookings, skipLocked: true });
    for (const { booking } of unpaid) {
      const note = "Payment was not received in time.";
      await tx.update(schema.bookings).set({ status: "expired", statusNote: note }).where(eq(schema.bookings.id, booking.id));
      await tx.update(schema.shipments).set({ status: "cancelled" }).where(eq(schema.shipments.id, booking.shipmentId));
      await addEvent(tx, booking.id, "expired", null, note);
      const order = await closeOrderForBooking(tx, booking, "expired", note);
      if (order) {
        await recordAudit({ actorId: null, action: "order.expired", entityType: "order", entityId: order.id, metadata: { note } }, tx);
        closed.push(order);
      }
    }
    return closed;
  });
}

export type OrderFilter = { customerId?: string; vendorId?: string; statuses?: OrderStatus[] };

export async function listOrders(filter: OrderFilter) {
  const conditions = [];
  if (filter.customerId) conditions.push(eq(schema.orders.customerId, filter.customerId));
  if (filter.vendorId) conditions.push(eq(schema.orders.vendorId, filter.vendorId));
  if (filter.statuses?.length) conditions.push(inArray(schema.orders.status, filter.statuses));
  const rows = await db()
    .select({ order: schema.orders, sellerName, customerName: schema.users.fullName, bookingStatus: schema.bookings.status })
    .from(schema.orders)
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.orders.vendorId))
    .innerJoin(schema.users, eq(schema.users.id, schema.orders.customerId))
    .leftJoin(schema.bookings, eq(schema.bookings.id, schema.orders.bookingId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.orders.createdAt))
    .limit(200);
  const items = rows.length
    ? await db()
        .select()
        .from(schema.orderItems)
        .where(inArray(schema.orderItems.orderId, rows.map((row) => row.order.id)))
    : [];
  const byOrder = new Map<string, OrderItem[]>();
  for (const item of items) {
    byOrder.set(item.orderId, [...(byOrder.get(item.orderId) ?? []), item]);
  }
  return rows.map((row) => ({ ...row, items: byOrder.get(row.order.id) ?? [] }));
}

export type OrderRow = Awaited<ReturnType<typeof listOrders>>[number];

export async function getOrderDetail(orderId: string) {
  const [row] = await db()
    .select({
      order: schema.orders,
      sellerName,
      sellerCity: schema.vendorProfiles.city,
      sellerState: schema.vendorProfiles.state,
      customerName: schema.users.fullName,
      customerPhone: schema.users.phone,
      bookingStatus: schema.bookings.status,
      bookingDueAt: schema.bookings.responseDueAt,
    })
    .from(schema.orders)
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.orders.vendorId))
    .innerJoin(schema.users, eq(schema.users.id, schema.orders.customerId))
    .leftJoin(schema.bookings, eq(schema.bookings.id, schema.orders.bookingId))
    .where(eq(schema.orders.id, orderId))
    .limit(1);
  if (!row) {
    return null;
  }
  const items = await db().select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
  return { ...row, items };
}

export async function trucksForOrder(vendorId: string, weightKg: number) {
  const rows = await db()
    .select({ id: schema.trucks.id, registrationNumber: schema.trucks.registrationNumber, make: schema.trucks.make, model: schema.trucks.model, maxPayloadKg: schema.trucks.maxPayloadKg })
    .from(schema.trucks)
    .where(and(eq(schema.trucks.vendorId, vendorId), inArray(schema.trucks.listingStatus, ["active", "unavailable"]), sql`${schema.trucks.archivedAt} is null`))
    .orderBy(schema.trucks.registrationNumber);
  return rows.filter((truck) => truck.maxPayloadKg >= weightKg);
}

export async function countOpenOrders(vendorId: string): Promise<number> {
  const [row] = await db()
    .select({ value: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(and(eq(schema.orders.vendorId, vendorId), eq(schema.orders.status, "awaiting_seller")));
  return row?.value ?? 0;
}
